import { createCrudClient } from "@/queries/v1";
import { IAppUser } from "@/types/user";
import Model from ".";

class AuthModel extends Model<IAppUser> {
  constructor() {
    super("/auth", "public-1");
  }
  // async requestCredit() {
  //   const res = await request("/add-beta-credits", {
  //     method: "POST",
  //     data: {},
  //   });

  //   return res;
  // }
}

const authModelInstance = new AuthModel();
export default authModelInstance;
export const authClient = createCrudClient(authModelInstance, {
  defaultParams: { limit: 50, entity: "auth" },
});
// function makeKey<const T extends string | number>(value: T) {
//   type Key = `use${T}asdf`;
//   return `use${value}asdf` as Key;
// }
function makeKey<const T extends string | number>(value: T) {
  type Generated = `use${T}asdf`;
  return null as unknown as Generated; // only type-level
}
const b = makeKey("hello");
const d = { a: 1, b: 2, c: "no" } as const;
type c = {
  [K in keyof typeof d as K extends `c${infer Rest}`
    ? `use${K}${Rest}`
    : K]: (typeof d)[K];
};

// type c = ReturnType<typeof makeKey<(typeof d)[keyof typeof d]>>;
