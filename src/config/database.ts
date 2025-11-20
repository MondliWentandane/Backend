import {Pool} from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({
    host:process.env.PGHOST,
    port:parseInt(process.env.PGPORT || "6543"),
    database:process.env.PGDATABASE,
    user:process.env.PGUSER,
    password:process.env.PGPASSWORD,
    ssl:{
        rejectUnauthorized:false,
    },
    idleTimeoutMillis:3000,
    connectionTimeoutMillis:2000,
})

export default pool;