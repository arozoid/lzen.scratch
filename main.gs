costumes "assets/lzen.svg" as "@ascii/@ascii/";

list chars = [];
var charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
list mem = [];

list chars40 = [];
list chars95 = [];
var charset40 = "abcdefghijklmnopqrstuvwxyz0123456789]=_[";  # ] and = are free for users
var charset95 = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
var _prefix = "@ascii/";

# lzecloud: converts a chars string to/from a decimal number string (base64 -> base10)
# processes 8 chars at a time (64^8 = 2.81e14 < 2^53, safe for scratch float)
# adds 10^14 offset to each chunk so it's always exactly 15 digits (no leading zero loss)
# trailer is a single decimal digit (1-8), so the whole output is pure digits, no letters
func lzecloud(e_d, input) {
    if $e_d == "e" {
        # encode: convert each chunk of 8 chars into a 15-digit decimal number
        local result = "";
        local len = length $input;
        local i = 1;
        until i > len {
            # pack up to 8 chars using costume for case-sensitive index lookup
            local val = 0;
            local p = 1;
            repeat 8 {
                if i <= len {
                    switch_costume _prefix & $input[i];
                    local char_idx = $input[i] in chars;
                    # uppercase costumes land at 34-59, lowercase at 66-91
                    if (costume_number() > 33) and (costume_number() < 60) {
                        char_idx += 26;
                    }
                    val += (char_idx - 1) * p;
                    p *= 64;
                    i++;
                }
            }
            # add 10^14 so the number is always exactly 15 digits (no leading zeros dropped)
            result &= val + 100000000000000;
        }
        # trailer: single digit (1-8) for last chunk real size
        local last_k = len % 8;
        if last_k == 0 { last_k = 8; }
        result &= last_k;
        return result;
    } else {
        if length $input < 2 { return ""; }
        # decode: read 1-digit trailer, then process 15-digit chunks
        local last_k = $input[length $input];
        local total_chunks = floor ((length $input - 1) / 15);
        local result = "";
        local i = 1;
        local chunk_num = 0;
        until chunk_num >= total_chunks {
            # read 15 digits and strip the 10^14 offset to get the original val
            local chunk_str = "";
            repeat 15 {
                chunk_str &= $input[i];
                i++;
            }
            local val = chunk_str - 100000000000000;
            chunk_num++;
            # last chunk only emits last_k chars, all others emit 8
            local emit_k = 8;
            if chunk_num == total_chunks { emit_k = last_k; }
            # unpack base-64 indices back into chars (case preserved since chars has both)
            repeat emit_k {
                result &= chars[floor (val % 64) + 1];
                val = floor (val / 64);
            }
        }
        return result;
    }
}

# lzencode: lz77 compress/decompress using charset40 as the alphabet
# back-references look like [(formula)[, where formula = (dist-1) * MAX_LEN + (len-1) (MAX_LEN=32)
# formula is encoded in base 39 to avoid using '[' (the 40th char) as a digit
# '[' is excluded from the compression process entirely (ignored in input)
# decode: dist = floor(formula / MAX_LEN) + 1, len = (formula % MAX_LEN) + 1
func lzencode(e_d, input) {
    local MAX_LEN = 32;
    local window_size = 256;
    delete mem;

    if $e_d == "d" {
        # decompress: walk through and expand any back-references we find
        local result = "";
        local i = 1;
        until i > length $input {
            if $input[i] == "[" {
                # it's a back-ref — parse the base40 formula out of [(formula)[
                i++;
                local formula_str = "";
                until $input[i] == "[" {
                    formula_str &= $input[i];
                    i++;
                }
                i++;
                # decode formula from base 39 (avoids '[')
                local formula_val = 0;
                local formula_p = 1;
                local formula_j = 1;
                repeat length formula_str {
                    formula_val += ((formula_str[formula_j] in chars40) - 1) * formula_p;
                    formula_p *= 39;
                    formula_j++;
                }
                local dist = floor (formula_val / MAX_LEN) + 1;
                local len = (formula_val % MAX_LEN) + 1;
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
        if $input[i] == "[" {
            # exclude [ from the compression process
            i++;
        } else {
            local best_len = 0;
            local best_dist = 0;
            # scan newest-first so we prefer shorter distances on equal-length ties
            local j = length mem;
            until j < 1 {
                if mem[j] == $input[i] {
                    local dist_j = length mem - j + 1;
                    local len = 1;
                    # (len % dist_j) wraps the index so overlapping refs work correctly
                    until (i + len > length $input) or (len >= MAX_LEN) or ($input[i + len] != mem[j + (len % dist_j)]) {
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
                # encode formula = (dist-1) * MAX_LEN + (len-1) in base 39 (avoids '[')
                local formula_val = (best_dist - 1) * MAX_LEN + (best_len - 1);
                local formula_str = "";
                if formula_val == 0 {
                    formula_str = chars40[1];
                } else {
                    until formula_val <= 0 {
                        formula_str &= chars40[(formula_val % 39) + 1];
                        formula_val = floor (formula_val / 39);
                    }
                }
                result &= "[" & formula_str & "[";
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

    set_ghost_effect 100;
    set_size 0;
    goto_back;
    hide;

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

