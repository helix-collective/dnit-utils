// Typescript "newtype" - "Flavoured" nominal typing.
// https://spin.atomicobject.com/2018/01/15/typescript-flexible-nominal-typing/

const sym0 = Symbol();
const sym1 = Symbol();
const sym2 = Symbol();
const sym3 = Symbol();

/// Zero type params - literal string type Name (fully scoped module name)
/// eg for 'newtype X = string' -> 'type X = Flavouring0<"X">;'
type Flavoring0<Name> = {
  readonly [sym0]?: Name;
};

/// 1 type param
/// eg for 'newtype X<T> = string' -> 'type X<T> = Flavouring1<"X",T>;'
type Flavoring1<Name, T> = Flavoring0<Name> & {
  readonly [sym1]?: T;
};

/// 2 type params
/// eg for 'newtype X<T,U> = string' -> 'type X<T,U> = Flavouring2<"X",T,U>;'
type Flavoring2<Name, T, U> = Flavoring1<Name, T> & {
  readonly [sym2]?: U;
};

/// 3 type params
/// eg for 'newtype X<T,U,V> = string' -> 'type X<T,U,V> = Flavouring3<"X",T,U,V>;'
type Flavoring3<Name, T, U, V> = Flavoring2<Name, T, U> & {
  readonly [sym3]?: V;
};
export type Newtype<A, Name> = A & Flavoring0<Name>;
export type Newtype1<A, Name, T> = A & Flavoring1<Name, T>;
export type Newtype2<A, Name, T, U> = A & Flavoring2<Name, T, U>;
export type Newtype3<A, Name, T, U, V> = A & Flavoring3<Name, T, U, V>;
