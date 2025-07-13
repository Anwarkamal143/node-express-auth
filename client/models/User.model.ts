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

const userModelInstance = new UserModel();
export default userModelInstance;
