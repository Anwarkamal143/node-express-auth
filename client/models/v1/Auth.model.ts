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
