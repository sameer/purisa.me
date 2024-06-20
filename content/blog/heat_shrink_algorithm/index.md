+++
title = "Heatshrink Algorithm"
date = 2024-06-03T19:26:36-07:00
description = "Breakdown of a general purpose compression algorithm for use in embedded systems."
[taxonomies]
tags = ["g-code", "compression"]
+++

_This post is the third in a series on [binary G-code](@/blog/binary_g_code/index.md)._

## Motivation

When a lossless compression algorithm (i.e. [DEFLATE](https://en.wikipedia.org/wiki/DEFLATE)) compresses data, it is finding and eliminating redundancy. This saves on space and bandwidth which is great because the same system can now handle more data. The amount of savings will depend on the algorithm used, but generally speaking there is a tradeoff: greater savings requires greater CPU time and memory.  

Some algorithms like [Zstd](https://en.wikipedia.org/wiki/Zstd) provide "levels" as an abstraction for controlling this tradeoff. If you are archiving web pages for long term storage, you might choose a high level to minimize space used. If you are sending telemetry in real time, you might choose a low level to keep latency low.

However, few algorithms can handle this tradeoff in an embedded environment where resource constraints are taken to an extreme. Such an algorithm must:

- **Use a small, configurable amount of memory.** Available memory can be as low as 1kB on a microcontroller. Bonus points for using no dynamic memory; performing heap allocations is quite bad for performance and introduces unpredictability. Some target systems could be SBCs with a few gigabytes of RAM so it should also be possible to use _more_ memory to compress faster/better.
- **Not need complex arithmetic.** Operations like multiplication and division will be quite slow, especially with larger integer types.
- **Be capable of streaming.** These devices are very I/O oriented so data must flow fast. Compressing data block by block isn't an option because it introduces significant delays.
- **Offer granular execution control.**  Concurrency/parallelism constructs may not be available so spawning a thread that calls into a single top-level compression function isn't possible. Additionally, there are often real-time constraints that require us to fine-tune when work happens.

## Heatshrink

[Heatshrink](https://github.com/atomicobject/heatshrink/) is a compression algorithm that meets all of these needs. Based on [LZSS](https://en.wikipedia.org/wiki/Lempel%E2%80%93Ziv%E2%80%93Storer%E2%80%93Szymanski), it has a simple operating principle: find and replace repeated byte sequences with references to previous occurrences. To understand this, let's look at how [Lorem ipsum](https://en.wikipedia.org/wiki/Lorem_ipsum#Example_text) is encoded:

> Lorem ipsum dolor sit amet, consectetur adipiscing eli$$(29,3)$$sed$$(49,3)$$ eiusmod temp$$(61,3)$$incididunt ut lab$$(95,3)$$ et$$(91,6)$$e magna aliqua. Ut enim$$(92,3)$$ mi$$(9,4)$$v$$(15,3)$$am, quis nostrud exercitation ullamco$$(90,6)$$$$(37,4)$$isi$$(106,4)$$$$(83,5)$$ip$$(45,3)$$ ea$$(185,3)$$m$$(148,3)$$o$$(193,6)$$$$(107,3)$$t. D$$(83,4)$$aute iru$$(138,3)$$$$(236,6)$$in reprehender$$(249,3)$$$$(17,3)$$volup$$(111,3)$$e$$(143,3)$$$$(234,3)$$ esse cill$$(290,8)$$$$(209,3)$$u fugiat n$$(145,4)$$ par$$(13,3)$$ur. Excepte$$(305,3)$$si$$(260,3)$$occaec$$(40,3)$$cupida$$(86,3)$$$$(215,3)$$n proiden$$(326,4)$$$$(298,4)$$$$(117,3)$$culpa$$(248,4)$$ officia deser$$(30,4)$$mol$$(135,4)$$a$$(289,4)$$i$$(271,3)$$s$$(344,7)$$um.

Each pair of numbers $$(idx,len)$$ in the encoding is a _backreference_, indicating that data at this position occurred previously. That data can be restored by going back $$idx$$ bytes from the current position and outputting $$len$$ bytes. Decoding the first backreference above $$(29,3)$$ gives us the trailing `t, ` from `Lorem ipsum dolor sit amet, `. Repeating this for every backreference returns the original text:

> Lorem ipsum dolor sit amet, consectetur adipiscing eli<b>t, </b>sed<b> do</b> eiusmod temp<b>or </b>incididunt ut lab<b>ore</b> et<b> dolor</b>e magna aliqua. Ut enim<b> ad</b> mi<b>nim </b>v<b>eni</b>am, quis nostrud exercitation ullamco<b> labor</b><b>is n</b>isi<b> ut </b><b>aliqu</b>ip<b> ex</b> ea<b> co</b>m<b>mod</b>o<b> conse</b><b>qua</b>t. D<b>uis </b>aute iru<b>re </b><b>dolor </b>in reprehender<b>it </b><b>in </b>volup<b>tat</b>e<b> ve</b><b>lit</b> esse cill<b>um dolor</b><b>e e</b>u fugiat n<b>ulla</b> par<b>iat</b>ur. Excepte<b>ur </b>si<b>nt </b>occaec<b>at </b>cupida<b>tat</b><b> no</b>n proiden<b>t, s</b><b>unt </b><b>in </b>culpa<b> qui</b> officia deser<b>unt </b>mol<b>lit </b>a<b>nim </b>i<b>d e</b>s<b>t labor</b>um.


All of the non-bolded characters were not encoded as backreferences. Instead, they are encoded as _literals_. For more details on the encoding, see the [documentation for icewrap](https://docs.rs/icewrap/latest/icewrap/): a Rust port of Heatshrink.

### Parameters

Heatshrink has two parameters: _window size_ and _lookahead_. Window size limits the negative offset for a backreference: $$window\text{\textunderscore}size \in [4, 15], idx \in [1, 2^{window\text{\textunderscore}size}]$$. Lookahead limits the length of a backreference: $$lookahead \in [3, window\text{\textunderscore}size - 1], len \in [1, 2^{lookahead}]$$. This has a few important consequences:


1. Decoding must buffer the last $$2^{window\text{\textunderscore}size}$$ bytes to restore backreferences.
1. Encoding has an internal buffer of $$2^{window\text{\textunderscore}size + 1}$$ bytes to generate backreferences.
1. Data can only be encoded if the decoder is given the same parameters as the encoder.
1. Heatshrink can be tuned to better fit the target system.

Adjusting lookahead does not affect memory usage. Instead, it controls the CPU time-compression ratio tradeoff when encoding. A higher lookahead means more time spent trying to generate backreferences.

There is also a third boolean parameter for the encoder, _indexing_, that when enabled will use additional memory to speed up encoding. This is generally useful if the system has lots of memory to spare.

### Memory Usage

Heatshrink's memory usage is well defined. It performs no heap allocations and the majority of its internal state is static. Based on the [parameters defined above](#parameters):

|Mode|Static|Stack|Heap|
|---|---|---|---|
|Encode|$$\lessapprox 2^{window\text{\textunderscore}size + 1} + 16$$|$$\lessapprox 32$$|$$0$$|
|Encode (indexed)|$$\lessapprox 3*2^{window\text{\textunderscore}size + 1} + 16$$|$$\lessapprox 512$$|$$0$$|
|Decode|$$\lessapprox 2^{window\text{\textunderscore}size} + 11$$|$$\lessapprox 8$$|$$0$$|

Note that this is just an estimation. Actual numbers will vary depending on the target architecture and compiler dark magic.

### Granular Control

Heatshrink offers a high degree of control over its execution. Internally encoding and decoding are both finite state machines with a `poll()` method for driving execution forward. Additionally, data only needs to be fed/emitted one byte at a time so it can be adapted to any I/O interface. This is perfect for streaming applications.

When encoding, one step is way more expensive than the rest: _searching_. This step iterates over the internal buffer to try and generate a backreference. The _indexing_ parameter can speed it up a little but there is unfortunately no way to suspend an active search.

### Safe For Untrusted Input

Because the format is so simple, there aren't really any error cases and it is generally safe to use on untrusted input.

Encoding is pretty straightforward -- data is pushed through until it is all processed. The worst possible scenario is that input data is completely random so time is wasted on trying to generate backreferences and the encoded data is larger. This is a [general limitation of lossless compression](https://en.wikipedia.org/wiki/Lossless_compression#Limitations).

On the decoding side, backreferences are masked so that they always lie within an internal circular buffer. The worst possible scenario is trying to decode a decompression bomb: a sequence of many large backreferences. Practically speaking this shouldn't be a big deal; Heatshrink is a streaming algorithm so user code would just have to verify that data is valid (i.e. check for [file signatures](https://en.wikipedia.org/wiki/List_of_file_signatures)) and limit the maximum decompressed size.

## What's next

After understanding how Heatshrink works, I ported it to Rust in the [icewrap](https://docs.rs/icewrap/latest/icewrap/) crate. This crate will eventually be used in the [g-code](https://github.com/sameer/g-code) crate to support binary G-code emission/parsing. In the next post, I will talk about the QOI image format and why it is supported by binary G-code.
