import { Seeder } from "arcanajs/arcanox";
import { UserFactory } from "../factories/UserFactory";

/**
 * User Seeder
 */
export class UserSeeder extends Seeder {
  async run() {
    const factory = new UserFactory();
    await factory.createMany(10);
  }
}

export default UserSeeder;
