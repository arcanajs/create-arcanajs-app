import { Route } from "arcanajs/server";
import UsersController from "../controllers/UsersController";

Route.get("/users", [UsersController, "users"]);

export default Route.getRouter();
