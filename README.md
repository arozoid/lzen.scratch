# \=\=\= LZen (7117990) \=\=\=
~630 blocks

LZen is a compression algorithm for storing data effectively.
LZen Cloud is a base 64 encoder to store data for cloud variables.

a-z, 0-9, ], _, and = are supported in LZen (base 39).
a-z, A-Z, 0-9, _, and - are supported in LZen Cloud (base 64).

## \=\=\= Usage \=\=\=

Both systems use these variables: 
"lzen_mode" (either 'e' for encode or 'd' for decode)
"lzen_input" (input for either system)
"lzen_output" (output variable after running broadcast)

[ broadcast and wait (lzencode) ] <- LZen
[ broadcast and wait (lzecloud) ] <- LZen Cloud

See this project on [Scratch](https://scratch.mit.edu/projects/1316064423/)

## \=\=\= Credits \=\=\=

Give thanks to the creators of LZ77 (a sliding window dictionary compression algorithm) for inspiring this project!

Programming:

* arozoid

Art & Design:

* arozoid

Engine:

* aspizu (goboscript, the Scratch compiler)

goboscript is found [here](https://github.com/aspizu/goboscript)
