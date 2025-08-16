import { createCrudClient } from "@/queries/v1";
import { IAppUser } from "@/types/user";
import Model from ".";

class UserModel extends Model<IAppUser> {
  constructor() {
    super("/user", "public-1");
  }
  // async requestCredit() {
  //   const res = await request("/add-beta-credits", {
  //     method: "POST",
  //     data: {},
  //   });

  //   return res;
  // }
}

const userModel = new UserModel();
export default userModel;
export const userClient = createCrudClient(userModel, {
  defaultParams: { limit: 50, entity: "user" },
});
