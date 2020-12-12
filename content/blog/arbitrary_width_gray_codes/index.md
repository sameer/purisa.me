+++
title = "Generating gray codes of arbitrary width"
date = 2020-05-23T19:20:36-04:00
+++

A [gray code](https://en.wikipedia.org/wiki/Gray_code) is an encoding of an n-bit unsigned number, such that adding one or subtracting one only changes a single bit:

$  n \in \mathbf{Z^+} \\\\
    x \in [0,1,\dots,2^n) \\\\
    i \in [0,1,\dots,n) \\\\
    \begin{aligned}
        gray(x) \oplus gray(x + 1 \bmod 2^n) = 2^i \\\\
        gray(x - 1 \bmod 2^n) \oplus gray (x) = 2^i \\\\
    \end{aligned}
$

Here's an example of a two-bit gray code:

|number|encoding|
|---|---|
|0|00|
|1|01|
|2|11|
|3|10|

Incrementing or decrementing by one from any position changes only a single bit.

## Dual-clock FIFOs

Gray codes have many uses, but what particularly interests me is their use in [clock domain crossing](https://en.wikipedia.org/wiki/Clock_domain_crossing).
I've [mentioned it before](/blog/mipi-camera-progress/#dual-clock-fifo), but the fastest way to move large amounts of data between two clock domains synchronously is a dual-clock FIFO.
A FIFO, short for first-in first-out, is a buffer that stores items and maintains their original ordering.
The sending clock domain can send data immediately, and the receiving clock domain can receive it when it wants.

A FIFO is typically implemented as a circular buffer with two pointers.
The sender indexes into the buffer using the write pointer, incrementing it whenever data is written.
The receiver indexes into the buffer using the read pointer, incrementing it whenever data is read.
The read pointer always stays ahead of the write pointer. This means:

1. If the sender is faster, it must wait for the receiver to read more data when the buffer is full (read-starved)
2. If the receiver is faster, it must wait for the sender to write more data when the buffer is empty (write-starved)

To detect these conditions, the sender must know the location of the reader's pointer, or vice versa.
Due to [metastability](/blog/mipi-camera-progress/#clock-domain-crossing), moving pointers between the domains is non-trivial.

Consider a 4-bit read pointer 15 (0b1111). The receiver reads a value and increments the pointer, making it wrap back to 0.
While this is happening, the sender tries to observe the read pointer.
A setup/hold violating could occur, in which case the observed value could be anything!
All the bits are transitioning and could resolve to a 0 or 1 from the sender's perspective.
Any value other than 0 would be wrong, and there's a real chance of that happening.

This is where gray code comes in; encoding the pointers when moving them between the two domains guarantees that only one bit will transition per increment.
That way, if a timing violation occurs, the pointer will just be resolved to the older value.
The sender might think the buffer is full early, or the receiver might think the buffer is empty early. Both of these are recoverable, so now the FIFO is safer!

## Generating a gray code by repeated reflection

Now that we've considered a use case for gray code, how do you make a coding? You can sketch it out on paper and try out a few different combinations, but it quickly gets tedious for numbers with many bits.

The easiest method to understand is generating by repeated reflection:

$ n \in \mathbb{Z^+} \\\\
x_i \in [0, 1] \\\\
X \in [0,1,\dots,2^n) \\\\
X = [x_0, x_1, \dots, x_{n-1}] \\\\
gray(X) := [grayBit(x_0), grayBit(x_1), \dots, grayBit(x_{n-1})] \\\\
grayBit(x_i) := \begin{cases}
    x_i &\text{if } X \bmod 2^{i+2} \lt 2^{i+1} \\\\
    1 - x_i &\text{otherwise}
\end{cases}
$

In simpler terms:

$ gray(X) := X \oplus (X \gg 1) \\\\
$

With an inverse function of:

$ degray(X) := \bigoplus_{j = 0}^{n} X \gg j\\\\
$

In just a few lines, you can describe a gray code valid for arbitrary width with O(n) run time, taking O(1) space.
The implementation in SystemVerilog is [available on GitHub](https://github.com/hdl-util/gray-code).

A nice property of reflection is that you can safely cast between bit widths without destroying the coding!


## Balanced gray code

The next step in my exploration of gray codes is to develop a similarly terse algorithm that can produce a [balanced gray code](https://en.wikipedia.org/wiki/Gray_code#Balanced_Gray_code).
When a gray code is balanced, the transitions (i.e. 16 for 4-bit, 256 for 8-bit) are uniformly distributed among all the bits.
I think this could improve metastability handling for a FIFO where one clock is very slow and one is very fast (i.e 48kHz to 300MHz).

More discussion and helpful research papers about this are [in issue #1 of hdl-util/gray-code on GitHub](https://github.com/hdl-util/gray-code/issues/1).
