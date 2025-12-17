import { User } from "../Models/User";

class UserRepository {
  async findById(id: number): Promise<User | null> {
    return await User.find(id);
  }
}

export default UserRepository;
