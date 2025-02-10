const JWT=require("jsonwebtoken");





const UserAuth=async(req,res,next)=>{
    try {
        const token=req.header('x-auth-token');
        if(!token) return res.status(401).send('Access Denied. No token provided.');
        const decoded=JWT.verify(token,process.env.SECRET_KEY);
        req.user=decoded;
        console.log("user",req.user);
        next();
    } catch (error) {
        res.status(400).send('Invalid token');
        
    }
}

module.exports={UserAuth};