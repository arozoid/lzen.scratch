%include std/math
costumes "assets/blank.svg" as "@ascii/@ascii/";

list chars = [];
var charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
list mem = [];

var charset40 = "abcdefghijklmnopqrstuvwxyz0123456789/<:>";
var charset95 = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
var _prefix = "@ascii/";

func lzecloud(e_d, input) {
    if $e_d == "e" {
        local result = 0;
        local i = 1;
        local p64 = 1;
        repeat length $input {
            switch_costume _prefix & $input[i];
            local char_idx = $input[i] in chars;
            if (costume_number() > 33) and (costume_number() < 60) {
                char_idx += 26;
            }
            result += (char_idx - 1) * p64;
            p64 *= 64;
            i++;
        }
        return round result;
    } else {
        local result = "";
        local val = $input;
        until val == 0 {
            result &= chars[floor (val % 64) + 1];
            val = floor (val / 64);
        }
        return result;
    }
}

func lzencode(e_d, input) {
    local window_size = 256;
    delete mem;

    if $e_d == "d" {
        # --- LZ77 DECOMPRESSION ---
        local result = "";
        local i = 1;
        until i > length $input {
            if $input[i] == "<" {
                i++;
                local dist_str = "";
                until $input[i] == ":" {
                    dist_str &= $input[i];
                    i++;
                }
                i++;
                local len_str = "";
                until $input[i] == ">" {
                    len_str &= $input[i];
                    i++;
                }
                i++;
                local dist = dist_str;
                local len = len_str;
                repeat len {
                    local char = mem[length mem - dist + 1];
                    result &= char;
                    add char to mem;
                    if length mem > window_size { delete mem[1]; }
                }
            } else {
                local char = $input[i];
                result &= char;
                add char to mem;
                if length mem > window_size { delete mem[1]; }
                i++;
            }
        }
        return result;
    }

    # --- LZ77 COMPRESSION ---
    local result = "";
    local i = 1;
    until i > length $input {
        local best_len = 0;
        local best_dist = 0;
        local j = 1;
        until j > length mem {
            if mem[j] == $input[i] {
                local len = 1;
                until (i + len > length $input) or (j + len > length mem) or ($input[i + len] != mem[j + len]) {
                    len++;
                }
                if len >= best_len {
                    best_len = len;
                    best_dist = length mem - j + 1;
                }
            }
            j++;
        }
        if best_len > 4 {
            result &= "<" & best_dist & ":" & best_len & ">";
            repeat best_len {
                add $input[i] to mem;
                if length mem > window_size { delete mem[1]; }
                i++;
            }
        } else {
            result &= $input[i];
            add $input[i] to mem;
            if length mem > window_size { delete mem[1]; }
            i++;
        }
    }
    return result;
}

onflag {
    delete chars;
    i = 1;
    repeat length charset {
        add charset[i] to chars;
        i++;
    }
    
    original = "stringstringstring/extra/stringstring";
    say "Compressing...";
    compressed = lzencode("e", original);
    say "Result: " & compressed;
    wait 2;
    
    say "Decompressing...";
    decompressed = lzencode("d", compressed);
    say "Final: " & decompressed;
    
    if original == decompressed {
        say "Success!";
    } else {
        say "Failure: Final = '" & decompressed & "'";
    }
}

