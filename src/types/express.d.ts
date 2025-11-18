import { Users } from "./users.types"

declare global{
    namespace Express {
        export interface Request{
            user?:Users
        }
    }
}