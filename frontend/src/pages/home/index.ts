import { HomeModel } from "@pages/home/model/home-model";

export async function initHomePage() {
  const homeModel = new HomeModel();
  await homeModel.init();
}