const axios = require("axios");
const FormData = require("form-data");

const api_key = "2cb1ba99b417044af6b2391607e1c254";


const Uploadmiddleware = async (req, res, next) => {
    console.log("middle ware touched");
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

    try {
        const formdata = new FormData();
        formdata.append("image", req.file.buffer.toString("base64")); // ImgBB requires base64 strings

        const { data } = await axios.post(
            `https://api.imgbb.com/1/upload?key=${api_key}`,
            formdata,
            {
                headers: formdata.getHeaders(),
            }
        );

        if (data.data.url) {
            console.log("url is",data.data.url);
            req.body.image = data.data.url; // Add the uploaded image URL to the request body
            next();
        } else {
            res.status(500).json({ msg: "Error: Unable to upload image" });
        }
    } catch (error) {
        console.error("Upload error:", error.response?.data || error.message);
        res.status(500).json({ msg: "Error while uploading the image" });
    }
};

module.exports = {
    Uploadmiddleware,   
};
