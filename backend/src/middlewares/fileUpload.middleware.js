import multer from "multer";

/*importing multer
1. Storing the images in diskStorage
2. Giving desitination to the as cb in the cb function and providing the destination
3. Modifying the filename if needed to prevent the same multiple files of same name.  
*/

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix);
  },
});

const upload = multer({ storage: storage });
