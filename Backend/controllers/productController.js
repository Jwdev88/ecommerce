import { v2 as cloudinary } from "cloudinary";
import Product from "../models/productModel.js";
import Category from "../models/categoryModel.js";
import mongoose from "mongoose";

const addProduct = async (req, res) => {
  const calculateTotalStock = (variants) => {
    if (!variants || variants.length === 0) {
      return 0; // Handle empty variants array
    }

    return variants.reduce((total, variant) => {
      if (variant && typeof variant.stock === "number") {
        return total + variant.stock;
      } else {
        console.error("Invalid variant:", variant);
        return total; // Or handle invalid variants differently
      }
    }, 0);
  };
  try {
    const {
      name,
      description,
      price,
      stock,
      weight,
      category,
      subCategory,
      variants,
      bestseller,
      sku,
    } = req.body;

    const image1 = req.files.image1 && req.files.image1[0];
    const image2 = req.files.image2 && req.files.image2[0];
    const image3 = req.files.image3 && req.files.image3[0];
    const image4 = req.files.image4 && req.files.image4[0];

    const images = [image1, image2, image3, image4].filter(
      (item) => item !== undefined
    );

    const imagesURI = await Promise.all(
      images.map(async (item) => {
        let result = await cloudinary.uploader.upload(item.path, {
          resource_type: "image",
        });
        return result.secure_url;
      })
    );
    let parsedVariants = [];
    if (typeof variants === "string" && variants.trim() !== "") {
      try {
        parsedVariants = JSON.parse(variants);
      } catch (error) {
        console.error("Error parsing variants:", error);
        // Tangani error parsing, misalnya dengan memberikan response error
        return res.status(400).json({
          success: false,
          message: "Invalid variants data",
        });
      }
    }

    const productData = {
      name,
      description,
      category,
      price: Number(price),
      stock: Number(stock),
      weight: Number(weight),
      subCategory,
      bestseller: bestseller === "true" ? true : false,
      variants: parsedVariants,
      images: imagesURI, // Menggunakan 'images' sesuai skema
      stock: calculateTotalStock(parsedVariants), // Menghitung total stok dari varian
      sku: sku,
      // calculateAverageWeight(JSON.parse(variants)), // Menghitung rata-rata berat dari varian (opsional)
    };

    const product = new Product(productData);
    await product.save();

    res
      .status(201)
      .json({ success: true, message: "Product berhasil ditambahkan" });
    console.log(product);
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
  // Fungsi untuk menghitung total stok dari semua varian
};

const editProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      name,
      description,
      category,
      subCategory,
      variants,
      bestseller,
      price,
      weight,
      stock,
      sku,
     
    } = req.body;

    const image1 = req.files.image1 && req.files.image1[0];
    const image2 = req.files.image2 && req.files.image2[0];
    const image3 = req.files.image3 && req.files.image3[0];
    const image4 = req.files.image4 && req.files.image4[0];

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid productId" });
    }

    const updatedData = {
      name: name,
      description: description,
      price: price,
      category: category,
      subCategory: subCategory,
      variants: variants ? JSON.parse(variants) : undefined, // Menggunakan variants
      bestseller: bestseller === "true" ? true : false,
      stock: stock,
      // stock: variants ,
      // ? calculateTotalStock(JSON.parse(variants)) : undefined, // Update stok
      weight: weight,
      // variants ? calculateAverageWeight(JSON.parse(variants)) : undefined, // Update berat (opsional)
    };

    const product = await Product.findByIdAndUpdate(productId, updatedData, {
      new: true,
    });

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const images = [image1, image2, image3, image4].filter(
      (item) => item !== undefined
    );

    if (images.length > 0) {
      const imagesURI = await Promise.all(
        images.map(async (item) => {
          try {
            let result = await cloudinary.uploader.upload(item.path, {
              resource_type: "image",
            });
            return result.secure_url;
          } catch (uploadError) {
            console.error("Cloudinary upload error:", uploadError);
            throw uploadError;
          }
        })
      );
      product.images = imagesURI; // Menggunakan 'images' sesuai skema
    }

    await product.save();

    res.json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
const deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.body.id);
    if (!deletedProduct)
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    res.status(200).json({ message: true, message: "Produk berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const { Id } = req.params;

    if (!Id || !mongoose.Types.ObjectId.isValid(Id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid productId" });
    }

    const product = await Product.findById(Id)
    .populate("category subCategory")
    .populate("variants")
    .populate("variants.options");
    res.json({ success: true, product });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await Product.find({})
      .populate("category")
      .populate("category subCategory")

      .populate("variants")
      .populate("variants.options");
    res.status(200).json({ success: true, products: products });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Gagal memuat data produk.",
    });
  }
};

export { addProduct, deleteProduct, getProductById, getProducts, editProduct };
