%include std/math
costumes "assets/blank.svg" as "@ascii/@ascii/";

list chars = [];
var charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
list mem = [];

list chars40 = [];
list chars95 = [];
var charset40 = "abcdefghijklmnopqrstuvwxyz0123456789]=:[";  # ] and = are free for users
var charset95 = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
var _prefix = "@ascii/";

# lzecloud: converts a string to/from a cloud-safe number using base 64
func lzecloud(e_d, input) {
    if $e_d == "e" {
        # encode: accumulate each char as a base-64 digit
        local result = 0;
        local i = 1;
        local p64 = 1;
        repeat length $input {
            # switch costume so we can tell upper from lowercase (list lookup is case-insensitive)
            switch_costume _prefix & $input[i];
            local char_idx = $input[i] in chars;
            # charset is lowercase-first then uppercase, so uppercase needs +26
            if (costume_number() > 33) and (costume_number() < 60) {
                char_idx += 26;
            }
            # add this char's value at the right power of 64, then shift
            result += (char_idx - 1) * p64;
            p64 *= 64;
            i++;
        }
        return round result;
    } else {
        # decode: extract base-64 digits one by one until nothing's left
        local result = "";
        local val = $input;
        until val == 0 {
            result &= chars[floor (val % 64) + 1];
            val = floor (val / 64);
        }
        return result;
    }
}

# lzencode: lz77 compress/decompress using charset40 as the alphabet
# back-references look like [dist:len[, literals are just plain chars
func lzencode(e_d, input) {
    local window_size = 256;
    delete mem;

    if $e_d == "d" {
        # decompress: walk through and expand any back-references we find
        local result = "";
        local i = 1;
        until i > length $input {
            if $input[i] == "[" {
                # it's a back-ref — parse the dist and len out of [dist:len[
                i++;
                local dist_str = "";
                until $input[i] == ":" {
                    dist_str &= $input[i];
                    i++;
                }
                i++;
                local len_str = "";
                # len ends when we hit the closing [ (same char as opener)
                until $input[i] == "[" {
                    len_str &= $input[i];
                    i++;
                }
                i++;
                local dist = dist_str;
                local len = len_str;
                # copy len chars from dist positions back — mem grows as we go (overlaps work)
                repeat len {
                    local char = mem[length mem - dist + 1];
                    result &= char;
                    add char to mem;
                    if length mem > window_size { delete mem[1]; }
                }
            } else {
                # plain literal — just pass it through and add to window
                local char = $input[i];
                result &= char;
                add char to mem;
                if length mem > window_size { delete mem[1]; }
                i++;
            }
        }
        return result;
    }

    # compress: for each position find the longest match in the window
    local result = "";
    local i = 1;
    until i > length $input {
        local best_len = 0;
        local best_dist = 0;
        # scan newest-first so we prefer shorter distances on equal-length ties
        local j = length mem;
        until j < 1 {
            if mem[j] == $input[i] {
                local dist_j = length mem - j + 1;
                local len = 1;
                # (len % dist_j) wraps the index so overlapping refs work correctly
                until (i + len > length $input) or ($input[i + len] != mem[j + (len % dist_j)]) {
                    len++;
                }
                if len > best_len {
                    best_len = len;
                    best_dist = dist_j;
                }
            }
            j--;
        }
        if best_len > 4 {
            # worth emitting a back-ref — saves space vs raw literals
            result &= "[" & best_dist & ":" & best_len & "[";
            repeat best_len {
                add $input[i] to mem;
                if length mem > window_size { delete mem[1]; }
                i++;
            }
        } else {
            # match too short — just emit the literal char
            result &= $input[i];
            add $input[i] to mem;
            if length mem > window_size { delete mem[1]; }
            i++;
        }
    }
    return result;
}

# lzobfus: packs charset40 lz77 output into a shorter charset95 string
# ratio: 6 base-40 chars -> 5 base-94 chars (40^6 = 4b fits in 94^5 = 7.3b)
# chars95[1] is space, which breaks costume names, so we always start from index 2
# a 1-char trailer at the end stores how many chars the last chunk actually had (1-6)
func lzobfus(e_d, input) {
    if $e_d == "e" {
        local result = "";
        local len = length $input;
        local i = 1;
        until i > len {
            # pack up to 6 base-40 chars into a single number
            local val = 0;
            local p = 1;
            repeat 6 {
                if i <= len {
                    local idx = $input[i] in chars40;
                    if idx > 0 { val += (idx - 1) * p; }
                    p *= 40;
                    i++;
                }
            }
            # unpack that number into 5 base-94 chars (using chars95[2..95] to skip space)
            repeat 5 {
                result &= chars95[(val % 94) + 2];
                val = floor (val / 94);
            }
        }
        # trailer: real char count of last chunk. if divisible by 6, last chunk was full
        local last_k = len % 6;
        if last_k == 0 { last_k = 6; }
        result &= chars95[last_k + 1];
        return result;
    } else {
        if length $input < 2 { return ""; }
        # decode: figure out chunk count from encoded length, then read the trailer
        local total_chunks = floor ((length $input - 1) / 5);
        switch_costume _prefix & $input[length $input];
        local last_k = costume_number() - 1;
        local result = "";
        local i = 1;
        local chunk_num = 0;
        until chunk_num >= total_chunks {
            # read 5 base-94 chars via costumes (case-sensitive, ascii order) into one number
            local val = 0;
            local p_chunk = 1;
            repeat 5 {
                switch_costume _prefix & $input[i];
                val += (costume_number() - 2) * p_chunk;
                p_chunk *= 94;
                i++;
            }
            chunk_num++;
            # all chunks emit 6 chars, except the last which only emits last_k
            local emit_k = 6;
            if chunk_num == total_chunks { emit_k = last_k; }
            # unpack the combined number back into base-40 chars
            repeat emit_k {
                result &= chars40[floor (val % 40) + 1];
                val = floor (val / 40);
            }
        }
        return result;
    }
}

on "lzencode" {
    if lzen_mode == "e" {
        # LZ77 string compression
        lzen_output = lzencode(lzen_mode, lzen_input);

        # base 40 -> base 95 (-1) [obfuscation coding]
        lzen_output = lzobfus(lzen_mode, lzen_output);
    } else {
        # base 95 (-1) -> base 40 [obfuscation decoding]
        lzen_output = lzobfus(lzen_mode, lzen_input);

        # LZ77 string decompression
        lzen_output = lzencode(lzen_mode, lzen_output);
    }
}

on "lzecloud" {
    lzen_output = lzecloud(lzen_mode, lzen_input);
}

onflag {
    # clear all lists before rebuilding from the charset strings
    delete chars;
    delete chars40;
    delete chars95;

    # populate chars (base-64 cloud alphabet)
    i = 1;
    repeat length charset {
        add charset[i] to chars;
        i++;
    }

    # populate chars40 (lz77 compressed alphabet)
    i = 1;
    repeat length charset40 {
        add charset40[i] to chars40;
        i++;
    }

    # populate chars95 (obfuscated output alphabet)
    i = 1;
    repeat length charset95 {
        add charset95[i] to chars95;
        i++;
    }
}

