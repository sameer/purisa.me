+++
title = "Enumerating Lattice Points in a Hypersphere"
date = 2019-05-15T16:26:41-04:00
description = "An intuitive algorithm for the task."
[taxonomies]
tags = ["theory"]
+++

### Definitions

To start things off, I want to give a few definitions:

* **Lattice point**: a point whose coordinates are integers: p &#8714; &#8484;<sup>n</sup>.
* **Hypersphere**: an n-dimensional shape of points within a distance r from a point p: {x | &#8721;<sup>n</sup><sub>i=0</sub> (x<sub>i</sub>-p<sub>i</sub>)<sup>2</sup> &le; r<sup>2</sup>}.
* **Hypercube**: an n-dimensional cube. Square in 2D, Cube in 3D.
* **Polytope**: an n-dimensional polygon.

### Hypercubes: a low hanging fruit
Counting the lattice points in a hypercube is possible in linear time proportional to the number of dimensions.

First, let's look at the 1D case. A hypercube in this context is just a range on a number line, \[x&#8321;,x&#8322;\]. The lattice points inside of this range are all the integer values between the two endpoints. To find them, you can round x&#8321; up and round x&#8322; down to the nearest whole number. In other words, take the ceiling and floor respectively. This gives us an integral subrange \[x&#8321;<sup>'</sup>,x&#8322;<sup>'</sup>\] that still contains all the lattice points. This makes it easy to count the lattice points as x&#8322;<sup>'</sup>-x&#8321;<sup>'</sup> and enumerate them by looping through the subrange.

Now consider the 2D case:

`Graphics[{Red, Rectangle[{-5, -5}, {5, 5}], Black, Point /@ Tuples[Range[-6, 6], 2]}]`

![Square graphed with lattice points](squarelatticeeasy.svg)

The square has a side length of 10 and is centered at the origin. Because each of the vertices corresponds with a lattice point, the contained lattice points are a 2-dimensional range from the lower left corner (x&#8321;,y&#8321;) to the upper right corner (x&#8322;,y&#8322;): {(x,y) | x&#8714; \[x&#8321;,x&#8322;\], y&#8714; \[y&#8321;,y&#8322;\]}. The total point count is (x&#8322;-x&#8321;)*(y&#8322;-y&#8322;) and can be enumerated with a nested loop. For this case, the number of lattice points is thus (5-(-5))(5-(-5))=100.

What about when the square's vertices are not lattice points?

`Graphics[{Red, Rectangle[{-5.5, -5.5}, {5.5, 5.5}], Black, Point /@ Tuples[Range[-6, 6], 2]}]`

![Square graphed with lattice points](squarelattice.svg)

 This can be reduced this to the previous situation by taking the floor of the upper right corner and the ceiling of the lower left corner. This is the *same* idea from the 1D case, but in 2D. Because all lattice points have integer values, they can only lie in this shrunken square: 

`Graphics[{Red, Rectangle[{-5.5, -5.5}, {5.5, 5.5}], Lighter@Red, Rectangle[{-5.5, -5.5} // Ceiling, {5.5, 5.5} // Floor], Black, Point /@ Tuples[Range[-6, 6], 2]}]`

![Shrunk square graphed on top of original square](squarelatticeshrunk.svg)

Rectangles also work with the above formulation. It applies to the 3D case by taking a 3D range. Formulated for the n-dimensional case: {(p&#8321;,p&#8322;,...,p<sub>n</sub>) | p&#8321;&#8714; \[r&#185;&#8321;,r&#185;&#8322;\], p&#8322;&#8714; \[r&#178;&#8321;,r&#178;&#8322;\],...,p<sub>n</sub>&#8714;\[r<sup>n</sup>&#8321;,r<sup>n</sup>&#8322;\]} where p is a lattice point and r is the range from the lowest to highest corner (superscript of r is the dimension here, sorry for any confusion).

#### Time analysis

Finding all the lattice points in an n-dimensional hypercube takes O(n) time. There are always only 2 corners for a hypercube, but the number of floor and ceiling operations increases linearly in higher dimensions.

### Hyperspheres: much harder

Enumerating and/or counting the lattice points inside a hypersphere is not as simple. Consider the 2D case, known as the [Gauss circle problem](https://en.wikipedia.org/wiki/Gauss_circle_problem):

`Graphics[{Red, Disk[{0, 0}, 10], Black, Point /@ Tuples[Range[-10, 10], 2]}]`

![Circle graphed with lattice points](circlelattice.svg)

There are a lot of methods that can work. One simple way is to take the escribed square, find the contained lattice points, and filter out those that do not lie in the circle.

`Graphics[{LightGray, Rectangle[{-10, -10}, {10, 10}], Red, Disk[{0, 0}, 10], Black, Point /@ Tuples[Range[-10, 10], 2]}]`

![Circle graphed with lattice points and an escribed square](escribedsquare.svg)

Unfortunately, this does not perform too well. Each lattice point in the square has to be checked, taking O(r&#178;) time. It gets worse with higher dimensions, taking O(r<sup>n</sup>) time for the n-dimensional case.

Runtime can be improved by only testing on the lattice points between the inscribed square and the escribed square:

`Graphics[{LightGray, Rectangle[{-10, -10}, {10, 10}], Red, Disk[{0, 0}, 10], Darker@Red, Rectangle[{-10, -10}/Sqrt[2], {10, 10}/Sqrt[2]], Black, Point /@ Tuples[Range[-10, 10], 2]}]`

![Circle graphed with lattice points an escribed square, and an inscribed square](escribedsquareandinscribedsquare.svg)

But this will still take O(r<sup>n</sup>) time. To improve this time bound, I tried and failed with many ideas including a [midpoint circle algorithm](https://en.wikipedia.org/wiki/Midpoint_circle_algorithm) adaptation, flood filling, scanlines, and appoximating the circle as an inscribed regular polygon with n sides.

In the end, I settled on a method that recursively solves the problem for each dimension. First, select the last dimension of the circle's center (y-axis) and solve the 1D problem on the range \[c<sup>y</sup>-r,c<sup>y</sup>+r\]. The 1D problem is luckily the same as the hypercube 1D problem mentioned above. This gives the range of possible values for the y-coordinate of a lattice point in the circle.

`Graphics[{Red, Disk[{0, 0}, 10], Black, Point /@ Tuples[{{0}, Range[-10, 10]}]}]`

![Circle graphed with the solution of 1D problem for y-axis](circle1dproblem.svg)

Now, at each possible y coordinate for a lattice point, solve the circle equation (x-a)<sup>2</sup>+(y-b)<sup>2</sup>=r<sup>2</sup> for x. This gives the range of lattice point coordinates in the x-axis, dependent on the current y-coordinate. The 1D problem is again solved on each x-coordinate range.

`Graphics[{Black, Disk[{0, 0}, 10], Black, MapIndexed[{Hue[#2[[1]]/25], Large // PointSize, Point[#1]} &, Tuples[{Range @@ MapIndexed[If[#2[[1]] == 2, #1 // Floor, #1 // Ceiling] &, x /. Solve[x^2 + #^2 == 10^2, x, Reals]], {#}}] & /@ Range[-10, 10]]}]`

![Circle graphed with 2D solution](circle2dproblem.svg)

For higher dimensions, this proceeds recursively up to n dimensions, solving for each new dimension added at each possible coordinate found in the lower dimensions.

I [implemented the method for the n-dimensional case in Mathematica](https://github.com/sameer/hypersphere-lattice-points). A few checks are included to double-check my implementation for enumeration, such as uniqueness of the points, whether they are in the circle, and a check for missing points. The way it is implemented gives all points at once rather than lazily enumerating them, so beware, *it may eat up all your RAM at a high radius/dimension!* There are a lot of neat tricks possible here like reflecting across the x and y axis, but this does not change the overall time complexity.


#### Time analysis

For the n-dimensional case, a series of lower dimensional cases are recursively solved. The total time taken is proportional to the hypervolumes of these cases, as this is approximately how many times the circle with missing coordinate equation is solved. In Big-O notation, this is O(V<sub>n-1</sub>(r)) where r is the hypersphere radius and V is a function that gives volume of the hypersphere in one lower dimension. If dealing with only a specific dimension, this can be viewed as O(r<sup>n-1</sup>) with a constant that shrinks as dimension increases. This means it is O(r) for circles and O(r<sup>2</sup>) for spheres.

## Concluding Remarks

Thus, I have shown above a method for enumerating hypersphere lattice points that scales with hypersphere surface area. This is an improvement over the naive approach which scales with hypersphere volume. There are many other shapes worth investigating, like a polytope. Barvinok's algorithm, which finds the lattice points in a convex polytope in polynomial time, is implemented by a team at UC Davis in the [LattE software package](https://www.math.ucdavis.edu/~latte/). It is worth investigating how the method above, if applied to convex polytopes, compares to LattE.

## Licensing

The [method and provided Mathematica code](https://github.com/sameer/hypersphere-lattice-points) is dual licensed under the Apache and MIT Licenses.

