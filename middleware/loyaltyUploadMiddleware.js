const multer = require("multer");
const path = require("path");
const fs = require("fs");


// =====================================================
// UPLOAD DIRECTORY
// =====================================================

const uploadDirectory =
    path.join(
        process.cwd(),
        "uploads",
        "loyalty"
    );


if (
    !fs.existsSync(
        uploadDirectory
    )
) {
    fs.mkdirSync(
        uploadDirectory,
        {
            recursive: true
        }
    );
}


// =====================================================
// STORAGE
// =====================================================

const storage =
    multer.diskStorage({

        destination: (
            req,
            file,
            cb
        ) => {
            cb(
                null,
                uploadDirectory
            );
        },

        filename: (
            req,
            file,
            cb
        ) => {

            const extension =
                path.extname(
                    file.originalname
                ).toLowerCase();

            const uniqueName =
                `loyalty-${Date.now()}-${Math.round(
                    Math.random() * 1e9
                )}${extension}`;

            cb(
                null,
                uniqueName
            );
        }
    });


// =====================================================
// FILE VALIDATION
// =====================================================

const fileFilter =
    (
        req,
        file,
        cb
    ) => {

        const allowedMimeTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/jpg"
        ];


        if (
            !allowedMimeTypes.includes(
                file.mimetype
            )
        ) {
            return cb(
                new Error(
                    "Only JPG, JPEG, PNG and WEBP images are allowed."
                )
            );
        }


        cb(
            null,
            true
        );
    };


// =====================================================
// MULTER
// =====================================================

const uploadLoyaltyImage =
    multer({

        storage,

        fileFilter,

        limits: {
            fileSize:
                5 * 1024 * 1024
        }
    });


// =====================================================
// EXPORT
// =====================================================

module.exports =
    uploadLoyaltyImage;