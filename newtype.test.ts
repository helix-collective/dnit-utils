// test/demo the Newtype
// this test exists at compile time

import type { Newtype } from "./newtype.ts";

{
  type StringA = Newtype<string, "StringA">;
  type StringB = Newtype<string, "StringB">;

  // @ts-expect-error : Newtype enforces same type usage as the wrapped type
  const xA: StringA = 1;

  let vA: StringA = "val A";
  let vB: StringB = "val B";

  // transparently converts back to underlying type if you ask for it
  let v: string;
  v = vA;
  v = vB;

  // @ts-expect-error : Newtype enforces difference of these types
  vB = vA;

  // @ts-expect-error : Newtype enforces difference of these types
  vA = vB;
}

{
  type NumberA = Newtype<number, "NumberA">;
  type NumberB = Newtype<number, "NumberB">;

  // @ts-expect-error - Newtype enforces same type usage as the wrapped type
  const xA: NumberA = "no";

  let vA: NumberA = 1;
  let vB: NumberB = 2;

  // transparently converts back to underlying type if you ask for it
  let v: number;
  v = vA;
  v = vB;

  // @ts-expect-error : Newtype enforces difference of these types
  vB = vA;

  // @ts-expect-error : Newtype enforces difference of these types
  vA = vB;
}

{
  // an example object type:
  type ObjectT = {
    fieldA: number;
    name: string;
  };

  type ObjectA = Newtype<ObjectT, "ObjectA">;
  type ObjectB = Newtype<ObjectT, "ObjectB">;

  // @ts-expect-error : Newtype enforces same type usage as the wrapped type
  const xA: ObjectA = "no";

  let vA: ObjectA = { fieldA: 1, name: "xx" };
  let vB: ObjectB = { fieldA: 2, name: "yy" };

  // transparently converts back to underlying type if you ask for it
  let v: ObjectT;
  v = vA;
  v = vB;

  // @ts-expect-error : Newtype enforces difference of these types
  vB = vA;

  // @ts-expect-error : Newtype enforces difference of these types
  vA = vB;
}

{
  // an example stringmap type
  type StringMap = {
    [key: string]: number;
  };

  type StringMapA = Newtype<StringMap, "StringMapA">;
  type StringMapB = Newtype<StringMap, "StringMapB">;

  // @ts-expect-error : Newtype enforces same type usage as the wrapped type
  const xA: StringMapA = "no";

  let vA: StringMapA = { x: 1, y: 2, z: 3 };
  let vB: StringMapA = { p: 10, q: 2, r: 4 };

  // transparently converts back to underlying type if you ask for it
  let v: StringMap;
  v = vA;
  v = vB;

  /* typescript doesn't currently enforce these on a stringmap type: [key:string] means anything is
  vB = vA;
  vA = vB;
  */
}
