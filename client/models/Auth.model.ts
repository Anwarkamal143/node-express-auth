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
