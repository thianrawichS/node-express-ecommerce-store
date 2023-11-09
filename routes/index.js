var express = require('express');
var router = express.Router();
const promisePool = require('./dbConnect')
const session = require('express-session');
const jwt = require('jsonwebtoken');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const numeral = require('numeral');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const oneMonth = 1000 * 60 * 60 * 24 * 30;
const imagePath = path.join(__dirname, '..', 'public', 'images');
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
require('dotenv').config()

function isLogin(req, res, next) {
  if (req.session.token != null){
    next();
  } else {
    res.redirect('/login');
  }
};

function isAdmin(req, res, next) {
  let decoded;
  if (req.session.token) {
    try {
      decoded = jwt.verify(req.session.token, process.env.SECRET_KEY);
    } catch (err) {
      console.error(`verification error: ${err}`)
    }
  };
  if (decoded.level == "Admin") {
    next()
  } else {
    res.redirect('/home')
  }
}

// Session
router.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {maxAge: oneMonth}
}));

// User Local Variable
router.use((req, res, next) => {
  try {
    if (req.session.token) {
      const decoded = jwt.verify(req.session.token, process.env.SECRET_KEY);
      res.locals = {
        name: decoded.name,
        id: decoded.id,
        level: decoded.level 
      }
    } else {
      res.locals = {
        name: null,
        id: null,
        level: null
      }
    }
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    res.locals.name = null;
    next();
  }
});
// Local Variable
router.use((req, res, next) => {
  res.locals.countCart = req.session.cart?.length || 0;
  res.locals.dayjs = dayjs;
  res.locals.numeral = numeral;
  next(); 
})

// First Page
router.get('/', (req, res, next) => {
  res.render('index')
});

//Home Page
router.get('/home', async (req, res) => {
  let productSql = "SELECT * FROM tb_product";
  let productGroupSql = "SELECT * FROM tb_product_group"
  let productData ;
  const searchProduct = req.query.searchProduct;
  const filterProductGroup = req.query.productGroup;
  if (searchProduct != undefined) {
    productSql += " WHERE product_name LIKE ?";
    productData = [`%${searchProduct}%`];
  } else if (filterProductGroup != undefined) {
    productSql += " WHERE product_group_id = ?";
    productData = [filterProductGroup];
  }

  productSql += " ORDER BY product_id DESC";

  try {
    const [productResults, productGroupResults] = await Promise.all([
      promisePool.query(productSql, productData),
      promisePool.query(productGroupSql)
    ]);
    
    res.render('home', {product:productResults, productGroup: productGroupResults, selectedProductGroupId: filterProductGroup})
  } catch (error) {
    console.error(`Error executing SQL queries: ${error}`)
    res.send(`Internal Server Error`)
  }
})
  // Product detail
  router.get('/product/:id', async (req, res) => {
    const addProductStatus = req.session.addProductStatus || [];
    req.session.addProductStatus = [];
    const productId = req.params.id;
    const productDetailSql = "SELECT product_id, product_name, selling_price, img, product_stock FROM tb_product WHERE product_id = ?"
    let productDetail;
    try {
      [productDetail] = await promisePool.query(productDetailSql, [productId]);
    } catch (err) {
      console.error('Error executing product query', err);
    }
    if (productDetail[0].product_stock == 0) {
      productDetail[0].product_status = 'disabled'
    }

    res.render('productDetail', {product:productDetail, addProductStatus:addProductStatus})
  })

// User's Register Page
router.get('/register', (req, res) => {
  const registerStatus = req.session.registerStatus || [];
  req.session.registerStatus = [];
  res.render('register', {registerStatus: registerStatus});
})
  // Register form submit
  router.post('/register', async (req, res) => {
    const {name, username, password, cfmPassword} = req.body;
    const level = 'User';
    const isNameDuplicateSql = "SELECT name FROM tb_user WHERE name = ?"
    const isUsernameDuplicateSql = "SELECT username FROM tb_user WHERE username = ?"
    const registerSql = "INSERT INTO tb_user SET name = ?, username = ?, password = ?, level = ?"
    
    let isNameDuplicate;
    let isUsernameDuplicate;
  
    try {
      [isNameDuplicate, isUsernameDuplicate] = await Promise.all([
        promisePool.query(isNameDuplicateSql, [name]),
        promisePool.query(isUsernameDuplicateSql, [username])
      ])
    } catch (err) {
      console.error('Error executing checking name/username query', err);
    }
    if (isNameDuplicate[0].length != 0) {
      req.session.registerStatus = 'failedName'
      res.redirect('/register')
    } else if (isUsernameDuplicate[0].length != 0) {
      req.session.registerStatus = 'failedUsername'
      res.redirect('/register')
    } else if (password != cfmPassword) {
      req.session.registerStatus = 'failedPwd'
      res.redirect('/register')
    } else {
      bcrypt.hash(password, saltRounds, async (hashError, hashedPassword) => {
         if (hashError) {
          console.error('Error hashing the password', hashError);
          return res.send('Internal Server Error');
         }
         const registerData = [name, username, hashedPassword, level];
         try {
          await promisePool.query(registerSql, registerData);
          res.redirect('/login')
         } catch (err) {
          console.error('Error executing register query', err);
          res.send('Internal Server Error');
         }
      })
    }
  })

// Login Page
router.get('/login', (req, res) => {
  loginStatus = req.session.loginStatus || [];
  req.session.loginStatus = [];
  res.render('login', {loginStatus: loginStatus});
});
  // Login
  router.post('/login', async (req, res) => {
    const sqlUser = 'SELECT * FROM tb_user WHERE username = ?';
    const {username, password} = req.body;
    let userData;
    try {
      [userData] = await promisePool.query(sqlUser, [username]);
    } catch (err) {
      console.error(`Error executing query: ${err}`)
    }

    if (userData.length === 1) {
      const storedPassword = userData[0].password;
      bcrypt.compare(password, storedPassword, (compareError, passwordMatch) => {
        if (compareError) {
          console.error('Error comparing passwords', compareError);
          return res.send('Internal Server Error')
        };

        if (passwordMatch) {
          const user = {
            id: userData[0].id,
            name: userData[0].name,
            level: userData[0].level
          }
          const token = jwt.sign(user, process.env.SECRET_KEY);
          req.session.token = token;
          res.redirect('/home')
        } else {
          req.session.loginStatus = 'failed'
          res.redirect('/login')
        }
      })
    }
  });

// Add to cart
router.get('/cart/add/:id', (req, res) => {
  let id = req.params.id;
  let cart = req.session.cart || [];
  let order = {
    productId: id,
    qty: 1
  };
  let isInCart = cart.find(item => {
    return item.productId == id
  });

  if (isInCart === undefined){
    cart.push(order);
  } else if (isInCart !== undefined){
    isInCart.qty += 1;
  }

  req.session.cart = cart
  req.session.addProductStatus = 'Add product to cart successfully'
  res.redirect(`/product/${id}`)
})

// Cart Page
router.get('/cart', async (req, res) => {
  const sql = "SELECT * FROM tb_product WHERE product_id = ?"
  let cart = req.session.cart || [];
  let order = [];
  let totalQty = 0
  let totalOrderPrice = 0

  if (cart.length !== 0) {
    const productData = cart.map(async (cartItem) => {
      try {
        const [rows] = await promisePool.query(sql, [cartItem.productId]);
        let product = {
          productId: rows[0].product_id,
          productName: rows[0].product_name,
          sellingPrice: rows[0].selling_price,
          productTotalPrice: (rows[0].selling_price * cartItem.qty),
          image: rows[0].img,
          qty: cartItem.qty
        }
        order.push(product);
      } catch (err) {
        console.error(`Error executing query: ${err}`)
      }
    });
    await Promise.all(productData);

    order.forEach(product => {
      totalQty += product.qty;
      totalOrderPrice += product.productTotalPrice;
    })
  }
  res.render('cart', {productInCart: order, totalQty: totalQty, totalPrice: totalOrderPrice}) 
});
  // Cart product delete
  router.get('/cart/delete/:id', (req, res) => {
    let productId = req.params.id
    let cart = req.session.cart || [];
    let itemToDelete = cart.findIndex(product => {
      return product.productId === productId
    });

    cart.splice(itemToDelete, 1);
    console.log(cart)
    req.session.cart = cart;
    res.redirect('/cart')
  });
  // Cart product amount edit
  router.post('/cart/edit/:id', (req, res) => {
    const productId = req.params.id;
    const {qty} = req.body
    let cart = req.session.cart || [];
    let itemToEdit = cart.findIndex(product => {
      return product.productId === productId;
    });
    try {
      if (cart.length !== 0 && itemToEdit !== -1) {
        cart[itemToEdit].qty = parseInt(qty);
        console.log(cart)
      };
    } catch (err) {
      console.error(err)
    };

    req.session.cart = cart;
    res.redirect('/cart')
  });

// Confirm Order Page
router.get('/cart/confirm-order', isLogin, (req, res) => {
  res.render('confirmOrder')
});
  // Submit confirm order
  router.post('/cart/confirm-order/:id', isLogin, async (req, res) => {
    const insertOrderSql = "INSERT INTO tb_order SET ?, status = ?, created_date = ?, user_id = ?";
    const insertOrderDetailSql = "INSERT INTO tb_order_detail SET order_id = ?, product_id = ?, qty = ?, total_price = ?";
    const productPriceSql = "SELECT selling_price FROM tb_product WHERE product_id = ?";
    const promisePool = require("./dbConnect2");
    const userId = req.params.id;
    let cart = req.session.cart || [];
    let orderStatus = "Awaiting Payment";
    let createdDate = dayjs().format('YYYY-MM-DD HH:mm:ss');
    let insertOrder;

    if (cart.length !== 0) {

      try {
        [insertOrder] = await promisePool.query(insertOrderSql, [req.body, orderStatus, createdDate, userId])
      } catch (err) {
        console.log(`Error executing Insert Order query: ${err}`)
      }

      cart.forEach(async (cartItem) => {
        let price;
        try {
          [price] = await promisePool.query(productPriceSql, [cartItem.productId]);
        } catch (err) {
          console.error(`Error executing price query: ${err}`)
        }

        let totalPrice = price[0].selling_price * cartItem.qty;
        try {
          await promisePool.query(insertOrderDetailSql, [insertOrder.insertId, cartItem.productId, cartItem.qty, totalPrice])
        } catch (err) {
          console.error(`Error executing Insert Order Detail query: ${err}`)
        }
      })

      req.session.cart = [];
      res.redirect(`/cart/confirm-order-success/${insertOrder.insertId}`)
    } else {
      res.send('Your cart is empty!');
    }
  });
  // Comfirm Order Success Page
  router.get('/cart/confirm-order-success/:orderId', isLogin, async (req, res) => {
    const orderId = req.params.orderId;
    const sql = "SELECT status FROM tb_order WHERE order_id = ?"
    let status;
    try {
      [status] = await promisePool.query(sql, [orderId]);
    } catch (err) {
      console.error(`Error executing status query: ${err}`);
    }
    res.render('confirmOrderSuccess', {status: status, orderId: orderId})
  });

// Your Order Page
router.get('/your-order/:id', isLogin, async (req, res) => {
  const userId = req.params.id;
  const selectUserOrder = "SELECT * FROM tb_order WHERE user_id = ? ORDER BY order_id DESC"
  let userOrder;

  try {
    [userOrder] = await promisePool.query(selectUserOrder, [userId]);
  } catch (err) {
    console.error(`Error executing your order query: ${err}`);
  }
  
  res.render('yourOrder', {userOrder: userOrder})
})

// Payment Confirm Form Page
router.get('/your-order/payment-confirm/:orderId', isLogin, (req, res) => {
  const orderId = req.params.orderId;
  res.render('paymentConfirm', {orderId: orderId})
})
  // Payment Confirm Submit
  router.post('/your-order/payment-confirm', isLogin, (req, res) => {
    const updateOrderSql = "UPDATE tb_order SET payment_id = ?, status = ? WHERE order_id = ?"
    const insertPaymentSql = "INSERT INTO tb_payment SET transfer_receipt_img = ?, pay_date = ?, pay_remark = ?, order_id = ?"
    const form = new formidable.IncomingForm();

    form.parse(req, async (err, fields, files) => {
      let imgData = `${dayjs().format('YYYYMMDDHHmmss')}${files.transfer_receipt_img[0].originalFilename}`;
      let paymentData = [
        imgData,
        fields.pay_date,
        fields.pay_remark,
        fields.order_id
      ]
      let originPath = files.transfer_receipt_img[0].filepath;
      let finalPath = path.join(imagePath, 'paymentImg', imgData);
      let updateOrderData;

      try {
        const [insertPayment] = await promisePool.query(insertPaymentSql, paymentData);
        updateOrderData = [
          insertPayment.insertId,
          'Payment Verification',
          fields.order_id
        ]
      } catch (err) {
        console.error(`Error executing insert payment query: ${err}`)
      }
      
      try {
        await promisePool.query(updateOrderSql, updateOrderData);
      } catch (err) {
        console.error(`Error executing update order query: ${err}`)
      }

      fs.rename(originPath, finalPath, (err) => {
        if (err) {
          console.error('Error renaming file', err);
          res.send('Error renaming file');
        } else {
          res.redirect('/home')
        }
      })
    })
  })

// Order Management Page
router.get('/order', isLogin, isAdmin, async (req, res) => {
  const sql = "SELECT * FROM tb_order ORDER BY order_id DESC";
  let order;
  try {
    [order] = await promisePool.query(sql);
  } catch (err) {
    console.log('Error executing order query', err)
  }
  res.render('order', {order: order})
});
  // Verify Payment
  router.get('/order/verify-payment/:id', isLogin, isAdmin, async (req, res) => {
    const orderId = req.params.id;
    const paymentSql = "SELECT od.order_id, pm.*" +
      " FROM tb_order AS od INNER JOIN tb_payment AS pm" +
      " ON od.payment_id = pm.payment_id WHERE od.order_id = ?";
    let paymentData;
    try {
      [paymentData] = await promisePool.query(paymentSql, [orderId]);
    } catch (err) {
      console.error('Error executing verify payment data', err);
    }
    res.render('verifyPayment', {paymentData: paymentData, orderId: orderId});
  });
    // Accept
    router.get('/order/verify-payment/accept/:orderId', isLogin, isAdmin, async (req, res) => {
      const orderId = req.params.orderId;
      const status = "Preparing order for shipping";
      const updateStatusSql = "UPDATE tb_order SET status = ? WHERE order_id = ?";
      const data = [status, orderId];
      try {
        await promisePool.query(updateStatusSql, data);
      } catch (err) {
        console.error('Error executing update order status query', err);
      }
      res.redirect('/order');
    })
    // Reject
    router.get('/order/verify-payment/reject/:orderId/:paymentId', isLogin, isAdmin, async (req, res) => {
      const {orderId, paymentId} = req.params;
      const status = "Payment Rejected / Awaiting Payment";
      const updateOrderSql = "UPDATE tb_order SET status = ?, payment_id = NULL WHERE order_id = ?";
      const selectImgSql = "SELECT transfer_receipt_img FROM tb_payment WHERE payment_id = ?";
      const delPaymentSql = "DELETE FROM tb_payment WHERE transfer_receipt_img = ?"
      const promisePool = require('./dbConnect2');
      let paymentImg;
      let receiptImgPath;

      try {
        [rows] = await promisePool.query(selectImgSql, [paymentId]);
        paymentImg = rows[0].transfer_receipt_img;
        receiptImgPath = path.join(imagePath, 'paymentImg', paymentImg);
      } catch (err) {
        console.log('Error executing select image query', err);
      }

      if (receiptImgPath != undefined) {
        fs.unlink(receiptImgPath, async (err) => {
          if (err) {
            console.error('Error unlink img', err);
            res.send('Error unlink image');
          }
          try {
            await Promise.all([
              promisePool.query(updateOrderSql, [status, orderId]),
              promisePool.query(delPaymentSql, [paymentImg])
            ])
          } catch (err) {
            console.error('Error executing reject payment query (del/update)',err)
          }
          res.redirect('/order')
        })
      }
    })
  // Cancel Order
  router.get('/order/cancel/:id', isLogin, isAdmin, async (req, res) => {
    const delOrderSql = "DELETE FROM tb_order WHERE order_id = ?";
    const delOrderDetailSql = "DELETE FROM tb_order_detail WHERE order_id = ?"
    const orderId = req.params.id;
    try {
      await Promise.all([
        promisePool.query(delOrderSql, [orderId]),
        promisePool.query(delOrderDetailSql, [orderId])
      ])
    } catch (error) {
      console.error('Error executing cancel order query', err);
    };
    res.redirect('/order');
  });
  // Remove record
  router.get('/order/remove-record/:id', isLogin, isAdmin, async (req, res) => {
    const orderId = req.params.id;
    const delOrderSql = "DELETE FROM tb_order WHERE order_id = ?";
    const delOrderDetailSql = "DELETE FROM tb_order_detail WHERE order_id = ?"
    const delPaymentSql = "DELETE FROM tb_payment WHERE order_id = ?"
    const selectImgSql = "SELECT transfer_receipt_img FROM tb_payment WHERE order_id = ?";
    let receiptImgPath;

    try {
      [rows] = await promisePool.query(selectImgSql, [orderId]);
      paymentImg = rows[0].transfer_receipt_img;
      receiptImgPath = path.join(imagePath, 'paymentImg', paymentImg);
    } catch (err) {
      console.log('Error executing select image query', err);
    }

    fs.unlink(receiptImgPath, async (err) => {
      if (err) {
        console.error('Error unlink img', err);
        res.send('Error unlink image');
      }
      try {
        await Promise.all([
          promisePool.query(delOrderSql, [orderId]),
          promisePool.query(delOrderDetailSql, [orderId]),
          promisePool.query(delPaymentSql, [orderId])
        ])
      } catch (err) {
        console.error('Error executing remove record query',err)
      }
      res.redirect('/order')
    })
  })
  // Ship Order Form Page
  router.get('/order/ship-order/:id', isLogin, isAdmin, (req, res) => {
    const orderId = req.params.id;
    res.render('shipOrder', {orderId: orderId});
  });
    // Ship Order Submit
    router.post('/order/ship-order', isLogin, isAdmin, async (req, res) => {
      const {order_id, send_date, shipping_name, shipping_tracking} = req.body;
      const status = "Shipped"
      const updateOrderSql = "UPDATE tb_order SET send_date = ?, shipping_name = ?, shipping_tracking = ?, status = ? WHERE order_id = ?";
      const data = [send_date, shipping_name, shipping_tracking, status, order_id];
      try {
        await promisePool.query(updateOrderSql, data);
      } catch (err) {
        console.error('Error executing update order shipping query', err)
      }
      res.redirect('/order')
    })

  // Order detail page
  router.get('/order/detail/:id', isLogin, async (req, res) => {
    const orderDetailSql = "SELECT *" +
      " FROM tb_order_detail AS odt" +
      " LEFT JOIN tb_product AS pd" +
      " ON odt.product_id = pd.product_id" +
      " WHERE odt.order_id = ?";
    const orderSql = "SELECT * FROM tb_order WHERE order_id = ?"
    const orderId = req.params.id;
    let totalPrice = 0;
    let totalQty = 0;
    let order;
    let orderDetail;
    try {
      [order, orderDetail] = await Promise.all([
        promisePool.query(orderSql, [orderId]),
        promisePool.query(orderDetailSql, [orderId])
      ])
      orderDetail[0].forEach(products => {
        totalPrice += products.total_price;
        totalQty += products.qty;
      })
    } catch (err) {
      console.error('Error executing select order query', err)
    }
    res.render('orderDetail', {orderDetail: orderDetail, order: order, totalPrice: totalPrice, totalQty: totalQty})
  })
    // Payment Proof page
    router.get('/order/detail/payment-proof/:id', isLogin, async (req, res) => {
      const orderId = req.params.id;
      const selectImg = "SELECT transfer_receipt_img FROM tb_payment WHERE order_id = ?"
      let paymentImg;
      try {
        [rows] = await promisePool.query(selectImg, [orderId]);
        paymentImg = rows[0].transfer_receipt_img;
      } catch (err) {
        console.error('Error executing select payment img query');
      }
      res.render('orderDetailPaymentProof', {paymentImg: paymentImg});
    })
  
// Profile Page
router.get('/profile', isLogin, (req, res) => {
  const updateUserStatus = req.session.updateUserStatus  || [];
  req.session.updateUserStatus = [];
  res.render('profile', {updateUserStatus: updateUserStatus})
});
  // Edit Profile
  router.post('/profileEdit/:id', isLogin, async (req, res) => {
    let sql = "UPDATE tb_user SET name = ? WHERE id = ?";
    let storedNameSql = "SELECT name FROM tb_user WHERE name = ?"
    let {name, level, originalName} = req.body;
    let id = req.params.id;
    let storedName;
    let newToken;

    try {
      [storedName] = await promisePool.query(storedNameSql, [name])
    } catch(err){
      console.error('Error executing checking user query', err);
      req.session.updateUserStatus = "Error while editing profile";
      res.redirect('/profile')
    }
    
    if (storedName.length != 0 && storedName[0].name != originalName) {
      req.session.updateUserStatus = "Name is already used";
      res.redirect('/profile')
    } else {
      try {
        await promisePool.query(sql, [name, id]);
        const user = {
          id: id,
          name: name,
          level: level
        }
        newToken = jwt.sign(user, process.env.SECRET_KEY);
        req.session.token = newToken
        req.session.updateUserStatus = "Update Profile successfully"
        res.redirect('/profile');
      } catch (err) {
        req.session.updateUserStatus = "Error while editing profile";
        console.error('Error executing update user query', err);
        res.redirect('/profile')
      }
    }
  });
  // Change Password Page
  router.get('/profile/edit-password/:id', isLogin, (req, res) => {
    const updateUserStatus = req.session.updateUserStatus || [];
    req.session.updateUserStatus = [];
    res.render('profileChangePwd', {updateUserStatus: updateUserStatus})
  })
    // Change Password
    router.post('/profile/edit-password', isLogin, async (req, res) => {
      let pwdSql = "SELECT password FROM tb_user WHERE id = ?";
      let updatePwdSql = "UPDATE tb_user SET password = ? WHERE id = ?";
      let {currentPwd, newPwd, cfmNewPwd, id} = req.body;
      let currentUserPassword

      try {
        [currentUserPassword] = await promisePool.query(pwdSql, [id]); 
      } catch (err) {
        console.error('Error comparing password', err);
      };

      bcrypt.compare(currentPwd, currentUserPassword[0].password, async (err, match) => {
        if (err) {
          console.error('Error comparing password', err);
          req.session.updateUserStatus = "Error while changing password"
          return res.redirect(`/profile/edit-password/${id}`)
        }
        if (match && newPwd == cfmNewPwd) {
          try {
            const hashedPassword = await bcrypt.hash(newPwd, saltRounds);
            await promisePool.query(updatePwdSql, [hashedPassword, id]);
            req.session.updateUserStatus = "Update password successfully"
            res.redirect(`/profile/edit-password/${id}`)
          } catch (err) {
            console.error('Error executing changing password query', err);
            req.session.updateUserStatus = "Error while changing password"
            res.redirect(`/profile/edit-password/${id}`)
          }
        } else {
          req.session.updateUserStatus = "Please provide the correct current password / confirm password"
          res.redirect(`/profile/edit-password/${id}`)
        }
      })
    });

// User Management Page
router.get('/usermanage', isLogin, isAdmin, async (req, res) => {
  const registerStatus = req.session.registerStatus || [];
  req.session.registerStatus = [];
  let sql = "SELECT id, name, username, level FROM tb_user ORDER BY level";
  let userData;

  try {
    [userData] = await promisePool.query(sql);
  } catch (err) {
    console.error('Error executing user query', err)
  }
  res.render('userManage', {userData: userData, registerStatus: registerStatus})
});
  // Create User
  router.post('/createuser', isLogin, isAdmin, async (req, res) => {
    const {name, username, password, cfmpassword, level} = req.body;
    const isNameDuplicateSql = "SELECT name FROM tb_user WHERE name = ?"
    const isUsernameDuplicateSql = "SELECT username FROM tb_user WHERE username = ?"
    const createUserSql = "INSERT INTO tb_user SET name = ?, username = ?, password = ?, level = ?"
    let isNameDuplicate;
    let isUsernameDuplicate;

    try {
      [isNameDuplicate, isUsernameDuplicate] = await Promise.all([
        promisePool.query(isNameDuplicateSql, [name]),
        promisePool.query(isUsernameDuplicateSql, [username])
      ])
    } catch (err) {
      console.error('Error executing checking name/username query', err);
      res.send('Internal Server Error')
    }

    if (isNameDuplicate[0].length != 0) {
      req.session.registerStatus = 'Name is already used'
      res.redirect('/usermanage')
    } else if (isUsernameDuplicate[0].length != 0) {
      req.session.registerStatus = 'Username is already used'
      res.redirect('/usermanage')
    } else if (password != cfmpassword) {
      req.session.registerStatus = 'Password and confirmation must be the same'
      res.redirect('/usermanage')
    } else {
      bcrypt.hash(password, saltRounds, async (hashError, hashedPassword) => {
        if (hashError) {
          console.error('Error hashing the password', hashError);
          return res.send('Internal Server Error');
        }
        const createUserData = [name, username, hashedPassword, level];
        try {
          await promisePool.query(createUserSql, createUserData);
          res.redirect('/usermanage')
        } catch (err) {
          console.error('Error executing create user query', err);
          res.send('Internal Server Error')
        }
      })
    }
  });
  // Edit User Page
  router.get('/edituser/:id', isLogin, isAdmin, async (req, res) => {
    let sql = "SELECT id, name, username, level FROM tb_user WHERE id = ?";
    let id = req.params.id;
    const updateUserStatus = req.session.updateUserStatus || [];
    req.session.updateUserStatus = [];
    let userData;
    try {
      [userData] = await promisePool.query(sql, [id]);
    } catch (err) {
      console.error('Error executing selected user query', err);
    }
    res.render('userManageEdit', {userData: userData, updateUserStatus: updateUserStatus})
  }) 
    // Edit User Password Page
    router.get('/edituser/password/:id', isLogin, isAdmin, (req, res) => {
      const userId = req.params.id;
      const updateUserStatus = req.session.updateUserStatus || [];
      req.session.updateUserStatus = [];
      res.render('userManageEditPwd', {userId: userId, updateUserStatus: updateUserStatus})
    })
      // Edit User Password Submit
      router.post('/edituser/password', isLogin, isAdmin, async (req, res) => {
        const {password, cfmPassword, id} = req.body;
        const updatePwdSql = "UPDATE tb_user SET password = ? WHERE id = ?"
        let hashedPassword;

        if (password != cfmPassword) {
          req.session.updateUserStatus = "Please confirm the password correctly"
          res.redirect(`/edituser/password/${id}`)
        } else {
          try {
            hashedPassword = await bcrypt.hash(password, saltRounds);
          } catch (err) {
            req.session.updateUserStatus = "Error updating user password"
            console.error('Error hashing password', err);
            res.redirect(`/edituser/password/${id}`)
          }
          let updatePwdData = [hashedPassword, id];
          try {
            await promisePool.query(updatePwdSql, updatePwdData);
            req.session.updateUserStatus = "Update User Successfully"
            res.redirect(`/edituser/password/${id}`)
          } catch (err) {
            req.session.updateUserStatus = "Error updating user password"
            console.error('Error executing update pwd query', err);
            res.redirect(`/edituser/password/${id}`)
          }
        }
      })
    // Edit User
    router.post('/edituser', isLogin, isAdmin, async (req, res) => {
      const storedNameSql = "SELECT name FROM tb_user WHERE name = ?"
      const storedUserNameSql = "SELECT username FROM tb_user WHERE username = ?"
      let {name, username, level, id, originalName, originalUsername} = req.body;
      let sql = "UPDATE tb_user SET name = ?, username = ?, level = ? WHERE id = ?"
      let sqlData = [name, username, level, id];
      let storedName;
      let storedUserName;

      try {
        [storedName, storedUserName] = await Promise.all([
          promisePool.query(storedNameSql, [name]),
          promisePool.query(storedUserNameSql, [username])
        ])
      } catch (err) {
        console.error('Error executing check name/user query', err);
      }

      if (storedName[0].length != 0 && storedName[0][0].name != originalName) {
        req.session.updateUserStatus = "Name is already used"
        res.redirect(`/edituser/${id}`)
      } else if (storedUserName[0].length != 0 && storedUserName[0][0].username != originalUsername) {
        req.session.updateUserStatus = "Username is alread used"
        res.redirect(`/edituser/${id}`)
      } else {
        try {
          await promisePool.query(sql, sqlData);
          req.session.updateUserStatus = "Update User Successfully"
        } catch (err) {
          req.session.updateUserStatus = "Failed to update user"
          console.error('Error executing update user query', err)
        }
        res.redirect(`/edituser/${id}`)
      }
    });
  // Delete User
  router.get('/deleteuser/:id', isLogin, isAdmin, async (req, res) => {
    let sql = "DELETE FROM tb_user WHERE id = ?";
    let id = req.params.id;
    try {
      await promisePool.query(sql, [id]);
    } catch (err) {
      console.error('Error executing delete user query', err);
    }
    res.redirect('/usermanage');
  });

// Product Type Page
router.get('/producttype', isLogin, isAdmin, async (req, res) => {
  let sql = "SELECT * FROM tb_product_group"
  let productType;
  try {
    [productType] = await promisePool.query(sql);
  } catch (err) {
    console.error('Error executing product type query', err);
  }
  res.render('productType', {productType: productType});
});
  // Add product type
  router.post('/producttype', isLogin, isAdmin, async (req, res) => {
    let sql = "INSERT INTO tb_product_group SET ?";
    let data = req.body
    try {
      await promisePool.query(sql, data);
    } catch (err) {
      console.error('Error executing add product type query', err);
    }
    res.redirect('/producttype')
  });
  // Edit product type
  router.post('/editproducttype/:id', isLogin, isAdmin, async (req, res) => {
    let sql = "UPDATE tb_product_group SET product_group_name = ? WHERE product_group_id = ?"
    let {product_group_name:productGroupName} = req.body;
    let id = req.params.id;
    try {
      await promisePool.query(sql, [productGroupName, id])
    } catch (err) {
      console.error('Error executing update product type query', err);
    }
    res.redirect('/producttype')
  });
  // Delete product type
  router.get('/deleteproducttype/:id', isLogin, isAdmin, async (req, res) => {
    let sql = "DELETE FROM tb_product_group WHERE product_group_id = ?"
    let id = req.params.id;
    try {
      await promisePool.query(sql, [id])
    } catch (err) {
      console.error('Error executing delete product type query', err);
    }
    res.redirect('/producttype')
  })

// Product Page
router.get('/product', isLogin, isAdmin, async (req, res) => {
  let productSql = "SELECT pd.product_stock, pd.product_id, pd.product_name, pdg.product_group_name, pd.cost_price, pd.selling_price, pd.img, pd.barcode" +
  " FROM tb_product AS pd" +
  " INNER JOIN tb_product_group AS pdg" +
  " ON pd.product_group_id = pdg.product_group_id" +
  " ORDER BY product_id DESC";
  let productGroupSql = "SELECT * FROM tb_product_group"
  let productData, productGroupData
  try {
    [productData, productGroupData] = await Promise.all([
      promisePool.query(productSql),
      promisePool.query(productGroupSql)
    ]);
  } catch (err) {
    console.error('Error executing product/product type query', err)
  }
  res.render('product', {product:productData, productGroup:productGroupData})
});
  // Add Product
  router.post('/product/add', isLogin, isAdmin, (req, res) => {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      let sql = "INSERT INTO tb_product SET ?";
      let data = [fields];
      let imgData;
      if (files.img) {
        sql += ", img = ?";
        imgData = `${dayjs().format('YYYYMMDDHHmmss')}${files.img[0].originalFilename}`;
        data.push(imgData);
        const oldPath = files.img[0].filepath;
        const newPath = path.join(imagePath, imgData);
        fs.rename(oldPath, newPath, (err) => {
          if (err) throw err;
        })
      };
      try {
        await promisePool.query(sql, data);
      } catch (err) {
        console.error('Error executing create product query', err);
      }
      res.redirect('/product');
    });
  });
  // Delete Product
  router.get('/product/delete/:id', isLogin, isAdmin, async (req, res) => {
    const delProductSql = "DELETE FROM tb_product WHERE product_id = ?";
    const ImgSql = "SELECT img FROM tb_product WHERE product_id = ?";
    const id = req.params.id;
    let productImg;

    try {
      [productImg] = await promisePool.query(ImgSql, [id])
    } catch (err) {
      console.error('Error executing select image query', err);
    }
    if (productImg[0].img !== null) {
      const delPath = path.join(imagePath, productImg[0].img);
      fs.unlink(delPath, (err) => {
        if (err) {
          console.error('Error unlink product img', err);
        }
      })
    } 
    try {
      await promisePool.query(delProductSql, [id])
    } catch (err) {
      console.error('Error executing delete product query', err);
    }
    res.redirect('/product')
  });

  // Edit Product Page
  router.get('/product/edit/:id', isLogin, isAdmin, async (req, res) => {
    const productSql = "SELECT pd.*, pdg.product_group_name" +
      " FROM tb_product AS pd" +
      " INNER JOIN tb_product_group AS pdg" +
      " ON pd.product_group_id = pdg.product_group_id" +
      " WHERE pd.product_id = ?";
    const productGroupSql = "SELECT * FROM tb_product_group";
    const productId = req.params.id;
    let productData, productGroupData;

    try {
      [productData, productGroupData] = await Promise.all([
        promisePool.query(productSql, [productId]),
        promisePool.query(productGroupSql)
      ]);
    } catch (err) {
      console.error('Error executing product/productGroup query', err);
    }
    res.render('editProduct', {product:productData, productGroup:productGroupData})
  });
    // Edit Product Submit
    router.post('/edit/product/:id', isLogin, isAdmin, (req, res) => {
      const id = req.params.id;
      const selectImgSql = "SELECT img FROM tb_product WHERE product_id = ?"
      const form = new formidable.IncomingForm();

      form.parse(req, async (err, fields, files) => {
        let updateProductSql = "UPDATE tb_product SET ?";
        let data = [fields,id]
        let prevImg;

        try {
          [prevImg] = await promisePool.query(selectImgSql, id);
        } catch (err) {
          console.error('Error executing select product img query', err);
        };
        
        if (files.img) {
          const imgData = `${dayjs().format('YYYYMMDDHHmmss')}${files.img[0].originalFilename}`
          const oldPath = files.img[0].filepath;
          const newPath = path.join(imagePath, imgData);
          updateProductSql += ", img = ?";
          data.splice(1,0, imgData);
          fs.rename(oldPath, newPath, (err) => {
            if (err) throw err;
          });
          if (prevImg[0].img !== null) {
            const delPath = path.join(imagePath, prevImg[0].img)
            fs.unlink(delPath, (err) => {
              if (err) throw err;
            })
          };
        };
        
        updateProductSql += " WHERE product_id = ?";

        try {
          await promisePool.query(updateProductSql, data)
        } catch (err) {
          console.error('Error executing update product query')
        }

        res.redirect('/product');
      })
    })

// Daily Sales Report Page
router.get('/sales-report/daily', isLogin, isAdmin, async (req, res) => {
  let currentYear = dayjs().year();
  let lastFiveYears = [];
  for (let i = currentYear-4; i <= currentYear; i++){
    lastFiveYears.push(i);
  };
  let sql = "WITH my_order AS (" +
    " SELECT odt.total_price, pm.pay_date" +
    " FROM tb_order_detail AS odt INNER JOIN tb_order AS od" +
    " ON odt.order_id = od.order_id INNER JOIN tb_payment AS pm" +
    " ON od.payment_id = pm.payment_id )" +
    " SELECT SUM(total_price) AS daily_income FROM my_order" +
    " WHERE DAY(pay_date) = ? AND" +
    " MONTH(pay_date) = ? AND" +
    " YEAR(pay_date) = ?";
  let monthsFilter = req.query.month || null;
  let yearsFilter = req.query.year || null;
  let daysInMonth = dayjs(`${yearsFilter}-${monthsFilter}-1`).daysInMonth();
  let dailyResults = [];
  let totalMonthlyIncome = 0;

  if (Object.keys(req.query).length !== 0){
    for (let day = 1; day <= daysInMonth; day++) {
      try {
        let [rows] = await promisePool.query(sql, [day, monthsFilter, yearsFilter])
        let dailyIncome = rows[0].daily_income;
        if (dailyIncome === null) {
          dailyResults.push(0);
        } else {
          dailyResults.push(dailyIncome);
          totalMonthlyIncome += parseInt(dailyIncome);
        };
      } catch (error) {
        console.error('Error executing query', error)
      }
    };
  }

  res.render('dailyReport', {years:lastFiveYears.reverse(), months: months, dailyResults: dailyResults, selectedMonth: monthsFilter, selectedYear: yearsFilter, totalMonthlyIncome:totalMonthlyIncome});
})

// Monthly Sales Report Page
router.get('/sales-report/monthly', isLogin, isAdmin, async (req, res) => {
  let currentYear = dayjs().year();
  let lastFiveYears = [];
  for (let i = currentYear-4; i <= currentYear; i++){
    lastFiveYears.push(i);
  };
  const sql = "WITH my_order AS (" +
    " SELECT odt.total_price, pm.pay_date" +
    " FROM tb_order_detail AS odt INNER JOIN tb_order AS od" +
    " ON odt.order_id = od.order_id INNER JOIN tb_payment AS pm" +
    " ON od.payment_id = pm.payment_id )" +
    " SELECT SUM(total_price) AS monthly_income FROM my_order" +
    " WHERE MONTH(pay_date) = ? AND" +
    " YEAR(pay_date) = ?";
  let {year} = req.query;
  let monthlyResults = [];
  let totalYearlyIncome = 0
  if (year != undefined && lastFiveYears.includes(parseInt(year))) {
    for (let i = 1; i <= months.length; i++){
      let [rows] = await promisePool.query(sql, [i, year]);
      let monthlyIncome = rows[0].monthly_income;
      if (monthlyIncome === null) {
        monthlyResults.push(0);
      } else {
        monthlyResults.push(monthlyIncome);
        totalYearlyIncome += parseInt(monthlyIncome);
      };
    }
  }
  console.log(monthlyResults);

  res.render('monthlyReport', {month: months, year:lastFiveYears.reverse(), monthlyResults: monthlyResults, totalYearlyIncome: totalYearlyIncome, selectedYear: year})
})

// Per-Product Sales Report Page
router.get('/sales-report/product', isLogin, isAdmin, async (req, res) => {
  const orderBy = ['total_income', 'total_quantity'];
  const selectedOrderBy = req.query.orderBy;
  let sql = "WITH my_order AS" +
    " (SELECT pd.barcode, pd.product_name, pd.selling_price, odt.qty, odt.total_price, pm.pay_date" +
    " FROM tb_order_detail AS odt" +
    " INNER JOIN tb_order AS od ON odt.order_id = od.order_id" +
    " INNER JOIN tb_payment AS pm ON od.payment_id = pm.payment_id" +
    " INNER JOIN tb_product AS pd ON odt.product_id = pd.product_id)" +
    " SELECT barcode, product_name, SUM(total_price) AS total_income, SUM(qty) AS total_quantity" +
    " FROM my_order GROUP BY product_name";
  let perProductResults;

  if (selectedOrderBy != undefined && orderBy.includes(selectedOrderBy)) {
    sql += ` ORDER BY ${selectedOrderBy} DESC`;
  }
  try {
    [perProductResults] = await promisePool.query(sql);
  } catch (err) {
    console.error('Error executing select product report query', err);
  }
  res.render('perProductReport', {perProductResults: perProductResults});
})

// Stock Report Page
router.get('/stock-report', isLogin, isAdmin, async (req, res) => {
  const stockSql = "SELECT pd.product_id, pd.barcode, pd.product_name, COALESCE(SUM(si.qty), 0) AS stock_in_quantity, " +
  "COALESCE((SELECT SUM(so.qty) FROM tb_stock_out so WHERE pd.product_id = so.product_id), 0) AS stock_out_quantity " +
  "FROM tb_product pd " +
  "LEFT JOIN tb_stock_in si ON pd.product_id = si.product_id " +
  "GROUP BY pd.product_id ORDER BY pd.product_id ASC";
  let stockData;
  try {
    [stockData] = await promisePool.query(stockSql);
  } catch (err) {
    console.error('Error executing stock report query', err);
  }
  res.render('stockReport', {stockResults: stockData});
});
// Stock-In Page
router.get('/stock-in', isLogin, isAdmin, async (req, res) => {
  const updateStockInStatus = req.session.updateStockIn || [];
  req.session.updateStockIn = [];
  let sql = "SELECT pd.product_name, pd.barcode, si.* FROM tb_stock_in AS si" +
  " INNER JOIN tb_product AS pd ON si.product_id = pd.product_id" +
  " ORDER BY si.stock_in_id DESC"
  let stockInData;
  try {
    [stockInData] = await promisePool.query(sql);
  } catch (err) {
    console.error('Error executing stock in query', err);
  }
  res.render('stockIn', {stockIn: stockInData, updateStatus: updateStockInStatus})
})
  // Stock-In Form Submit
  router.post('/stock-in', isLogin, isAdmin, async (req, res) => {
    const {barcode, qty, remark} = req.body;
    const isProductSql = "SELECT product_id FROM tb_product WHERE barcode = ?";
    let updateProductStock = "UPDATE tb_product SET product_stock = product_stock + ? WHERE product_id = ?";
    let insertStockIn = "INSERT INTO tb_stock_in SET product_id = ?, qty = ?, created_date = NOW()";
    let isProduct;

    try {
      [isProduct] = await promisePool.query(isProductSql, [barcode]);
    } catch (err) {
      console.error('Error executing check product query', err);
    }

    if (isProduct.length != 0) {
      let updateProductStockData = [qty, isProduct[0].product_id];
      let insertStockInData = [isProduct[0].product_id, qty];
      if (remark != undefined) {
        insertStockIn += ", remark = ?";
        insertStockInData.push(remark);
      }
      try {
        await Promise.all([
          promisePool.query(insertStockIn, insertStockInData),
          promisePool.query(updateProductStock, updateProductStockData)
        ])
        req.session.updateStockIn = 'success';
      } catch (err) {
        console.error('Error executing update stock-in query', err);
        req.session.updateStockIn = 'failed';
      }
    } else {
      req.session.updateStockIn = 'failed';
    }

    res.redirect('/stock-in')
  })
  // Stock-In delete
  router.get('/stock-in/delete/:stock_in_id/:product_id/:qty', isLogin, isAdmin, async (req, res) => {
    const delSql = "DELETE FROM tb_stock_in WHERE stock_in_id = ?";
    const updateProductStock = "UPDATE tb_product SET product_stock = product_stock - ? WHERE product_id = ?"
    const delData = [req.params.stock_in_id];
    const updateProductStockData = [req.params.qty, req.params.product_id];
    try {
      await Promise.all([
        promisePool.query(delSql, delData),
        promisePool.query(updateProductStock, updateProductStockData)
      ])
    } catch (err) {
      console.error('Error executing del stock-in query', err);
    }
    res.redirect('/stock-in');
  });

// Stock-Out Page
router.get('/stock-out', isLogin, isAdmin, async (req, res) => {
  const updateStockOutStatus = req.session.updateStockOut || [];
  req.session.updateStockOut = []
  let sql = "SELECT pd.product_name, pd.barcode, so.* FROM tb_stock_out AS so" +
  " INNER JOIN tb_product AS pd ON so.product_id = pd.product_id" +
  " ORDER BY so.stock_out_id DESC"
  let stockOutData;
  try {
    [stockOutData] = await promisePool.query(sql);
  } catch (err) {
    console.error('Error executing stock-out query', err);
  }
  res.render('stockOut', {stockOut: stockOutData, updateStatus: updateStockOutStatus})
})
  // Stock-Out Form Submit
  router.post('/stock-out', isLogin, isAdmin, async (req, res) => {
    const {barcode, qty, remark} = req.body;
    const isProductSql = "SELECT product_id, product_stock FROM tb_product WHERE barcode = ?";
    let updateProductStock = "UPDATE tb_product SET product_stock = product_stock - ? WHERE product_id = ?";
    let insertStockIn = "INSERT INTO tb_stock_out SET product_id = ?, qty = ?, created_date = NOW()";
    let isProduct;

    try {
      [isProduct] = await promisePool.query(isProductSql, [barcode]);
    } catch (err) {
      console.error('Error executing check product query', err);
    }

    if (isProduct.length == 0) {
      req.session.updateStockOut = 'failed';
    } else if (isProduct[0].product_stock < parseInt(qty)) {
      req.session.updateStockOut = 'not-available';
    } else if (isProduct[0].product_stock >= parseInt(qty)) {
      let updateProductStockData = [qty, isProduct[0].product_id]
      let insertStockInData = [isProduct[0].product_id, qty]
      if (remark != undefined) {
        insertStockIn += ", remark = ?";
        insertStockInData.push(remark);
      }
      try {
        await Promise.all([
          promisePool.query(insertStockIn, insertStockInData),
          promisePool.query(updateProductStock, updateProductStockData)
        ])
        req.session.updateStockOut = 'success';
      } catch (err) {
        console.error('Error executing update stock-in query', err);
      }
    }
    res.redirect('/stock-out')
  })
  // Stock-out delete
  router.get('/stock-out/delete/:stock_out_id/:product_id/:qty', isLogin, isAdmin, async (req, res) => {
    const promisePool = require('./dbConnect2');
    const delSql = "DELETE FROM tb_stock_out WHERE stock_out_id = ?";
    const updateProductStock = "UPDATE tb_product SET product_stock = product_stock + ? WHERE product_id = ?"
    const delData = [req.params.stock_out_id];
    const updateProductStockData = [req.params.qty, req.params.product_id];
    try {
      await Promise.all([
        promisePool.query(delSql, delData),
        promisePool.query(updateProductStock, updateProductStockData)
      ])
    } catch (err) {
      console.error('Error executing del stock-out query', err);
    }
    res.redirect('/stock-out');
  });

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;