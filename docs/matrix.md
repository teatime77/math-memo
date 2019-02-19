# 行列


```math
\newcommand{\red}[1]{ \color{red}{#1} }

```

 `$ A $`  を  `$ M \times M $`  の正方行列(square matrix)とする。

```math
A u_i = \lambda_i u_i  \qquad for \ \  i = 1,...,M 
\tag{C.29}
```
 `$ u_i $` を固有ベクトル(eigenvector)、 `$ \lambda_i $` を固有値(eigenvalue)という。<br/>

解が存在する条件(condition for a solution)は
```math
\mid A - \lambda_i I \mid = 0
\tag{C.30}
```
この式は `$ \lambda_i $`  のn次の多項式(polynomial of order M)なので、複素数(complex number)の範囲で解を持つ。<br/>
<br/>
<b> 対称行列(symmetric matrix)の固有値は実数 </b>

式(C.29)に `$ \red{(u_i^\ast)^T} $` をかけて
```math

\red{(u_i^\ast)^T} A u_i = \lambda_i \red{(u_i^\ast)^T} u_i
\tag{C.31}
```

式(C.29)の複素共役(complex conjugate)はAが実行列(real matrix)なので
```math
A u_i^\ast = \lambda_i^\ast u_i^\ast
```

 `$ \red{u_i^T} $` をかけて
```math
\red{u_i^T} A u_i^\ast = \lambda_i^\ast \red{u_i^T} u_i^\ast
\tag{C.32}
```

これの転置(transpose)は
```math
(u_i^T A u_i^\ast)^\red{T} = (\lambda_i^\ast u_i^T u_i^\ast)^\red{T}
```
 `$ A^T=A $` を使って
```math
(u_i^\ast)^T A u_i = \lambda_i^\ast (u_i^\ast)^T u_i
```

これと式(C.31)から  `$ \lambda_i^\ast = \lambda $`  となり、 `$ \lambda $`  は実数(real)


<b> 対称行列(symmetric matrix)の固有ベクトルは正規直交系(orthonormal system)になる。 </b>

```math
u_i^T u_j = I_{ij}
\tag{C.33}
```
(C.29)に `$u_j^T$` をかけて
```math
\red{u_j^T} A u_i = \lambda_i \red{u_j^T} u_i
\tag{C.34}
```

添え字を入れ替えて
```math
u_\red{i}^T A u_\red{j} = \lambda_\red{j} u_\red{i}^T u_\red{j}
\tag{C.35}
```

これを転置(transpose)して
```math
(u_i^T A u_j)^\red{T} = (\lambda_j u_i^T u_j)^\red{T}
```
行列の積の転置を分解し、 `$A^T = A$` なので
```math
u_j^T A u_i = \lambda_j u_j^T u_i
```

式(C.34)から上式を引くと
```math
(\lambda_i - \lambda_j) u_j^T u_i = 0
\tag{C.36}
```

`$\lambda_i \neq \lambda_j$` なので `$u_j^T u_i = 0$` になる。

