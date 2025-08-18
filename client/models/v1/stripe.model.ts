import { createCrudClient } from "@/queries/v1";
import { Stripe } from "@stripe/stripe-js";
import Model from ".";

class StripeModel extends Model<Stripe> {
  constructor() {
    super("/stripe", "public-1");
  }
  // async requestCredit() {
  //   const res = await request("/add-beta-credits", {
  //     method: "POST",
  //     data: {},
  //   });

  //   return res;
  // }
}

const stripeModel = new StripeModel();
export default stripeModel;
export const stripeClient = createCrudClient(stripeModel, {
  defaultParams: { limit: 50, entity: "stripe" },
});
