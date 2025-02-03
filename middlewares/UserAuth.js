// const JWT=require("jsonwebtoken");

// const UserAuth= (req,res,next) => {
    
//         // const token=req.header('x-auth-token');
//         // if(!token) return res.status(401).send('Access Denied. No token provided.');
//         // const decoded=JWT.verify(token,process.env.SECRET_KEY);
//         // req.user=decoded;

        
 
// }

const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Invalid JWT Token" });
    }

    const jwtToken = authHeader.split(" ")[1];

    if (!jwtToken) {
        return res.status(401).json({ message: "Invalid JWT Token" });
    }

    jwt.verify(jwtToken, process.env.SECRET_KEY, (error, payload) => {
        if (error) {
            return res.status(401).json({ message: "Invalid JWT Token" });
        }
        req.user = payload; 
        next();
    });
};

module.exports = authenticateToken;


