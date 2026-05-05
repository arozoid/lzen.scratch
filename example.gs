costumes "assets/lzen.svg";

onflag {
    wait 1;
    lzen_mode = "e";
    lzen_input = "stringystringshavestringedmystringstring";
    say "LZen is a compression algorithm that mimics LZ77's sliding window technology with base40 to base94 encoding.", 4;
    say "LZen supports lowercase a-z, 0-9, ], _, and = for data storage.", 3;
    say "Here's an example:", 3;
    say "input: " & lzen_input, 3;
    broadcast_and_wait "lzencode";
    say "compressed: " & lzen_output, 3;

    lzen_mode = "d";
    lzen_input = lzen_output;
    broadcast_and_wait "lzencode";
    say "decompressed: " & lzen_output, 3;

    say "The compressed version was 31 chars long, compared to the original's 40! The program yields 10-30% compression rate on average.", 5;

    say "You can also use LZen Cloud in order to convert base64 values into integers!", 4;
    say "LZen Cloud supports a-z, A-Z, 0-9, _, and -", 3;
    say "Here's an example of LZen Cloud:", 3;
    lzen_mode = "e";
    lzen_input = "testing_123-arozoid";
    say "input: " & lzen_input, 3;
    broadcast_and_wait "lzecloud";
    say "encoded: " & lzen_output, 3;

    lzen_mode = "d";
    lzen_input = lzen_output;
    broadcast_and_wait "lzecloud";
    say "decoded: " & lzen_output, 3;

    say "You can use LZen to compress things like game state/data, via [broadcast \"lzencode\"]!", 4;
    say "You can also use LZen Cloud, via [broadcast \"lzecloud\"]!", 4;
    say "Both take 'lzen_mode' (either 'e' for encode or 'd' for decode) and 'lzen_input' to work properly, and then output via 'lzen_output'.", 4;
    say "Thank you :3 - arozoid", 2;
}