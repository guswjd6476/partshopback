const express = require('express');
const db = require("./DB.js"); //database 

const app = express();
const mailer = require('./mail');

let cors = require('cors'); // 설치시 모든 도메인에서 제한 없이 해당 서버에 용청 및 응답을 받을 수 있음.
const bodyParser = require('body-parser');
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
const port =  5000;
const jwt = require("jsonwebtoken");
// app.use('/vapi', createProxyMiddleware({target:'https://ollehfarm-guswjd6476.koyeb.app',changeOrigin:true}))

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.json());
let corsOptions = {
  origin: "*", // 출처 허용 옵션
  credential: true, // 사용자 인증이 필요한 리소스(쿠키 ..등) 접근
};

app.use(cors(corsOptions));
//---(1) express 서버 셋팅 및 subscribe. database save---------------------// 
app.listen(port, () => {
    console.log(`listening on ${port}`);
   
      


});

// 쿼리문에 사용되는 변수 

// 회원가입 _ 중복확인
app.get('/api/useridcheck', (req, res) => {
  db.query('SELECT * FROM userinfo WHERE userId = ?', [req.query.userId], (error, results, fields) => {
    if (results.length>0 && results[0]) {
      res.status(200).send(true);
    }else{
      res.status(200).send(false);
    }
  })

})

  // 회원가입 인증 관련 

  app.get('/api/mail', (req, res) => {
      var variable = "0,1,2,3,4,5,6,7,8,9,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z".split(",");
      var randomPassword = createRandomPassword(variable, 8);
      //비밀번호 랜덤 함수
      function createRandomPassword(variable, passwordLength) {
        var randomString = "";
        for (var j = 0; j < passwordLength; j++)
          randomString += variable[Math.floor(Math.random() * variable.length)];
        return randomString
      }
      let emailParam = {
        toEmail: req.query.userId,     // 수신할 이메일

        subject: '회원 가입 인증 메일입니다.',   // 메일 제목

        text: `안녕하세요 인증번호는 : ` + randomPassword + `입니다`               // 메일 내용
      };
      mailer.sendGmail(emailParam);
      console.log(randomPassword)
      res.status(200).send(randomPassword);
  })
// 회원가입 _ 최종등록
app.get('/api/join', (req, res) => {

  db.query('INSERT INTO userinfo(userId,uPassword,uPhone) VALUES (?,?, ?) ', [req.query.userId,req.query.uPassword, req.query.uPhone], (error, results, fields) => {
  console.log(req.query.userId)
  console.log(req.query.uPassword)
  console.log(req.query.uPhone)
    res.status(200).send(true);
  })

});

// 토큰 발급

app.get('/api/login', (req, res) => {
  // 클라이언트에서 전달된 사용자 정보를 검증합니다.

  db.query('SELECT * FROM userinfo WHERE userId = ? AND uPassword = ?',
      [req.query.userId, req.query.uPassword], (error, results, fields) => {
        function generateToken(user) {
          // 토큰에 포함될 정보 (payload)를 정의합니다.
          const payload = {
            userId: user.userId,
            uPassword: user.uPassword
          };
          // 토큰 발급 시 사용할 secret key 값을 정의합니다.
          const secretKey = "mySecretKey";
        
          // 토큰의 유효 시간을 정의합니다.
          const options = {
            expiresIn: "1h",
          };
        
          // JWT를 발급합니다.
          const token = jwt.sign(payload, secretKey, options);
        
          return token;
        }
        
        if (results[0]) {
          const token = generateToken(req.query);
          const userId = results[0].userId
          const uName = results[0].uName
          const uPhone = results[0].uPhone
          const uGrade = results[0].uGrade
          let objects = [{
            token : token,
            userId : userId,
            uName : uName,
            uPhone : uPhone,
            uGrade : uGrade
          }
          ]
       
          res.status(200).send(objects);
        } else {
          //회원 조회 X
          res.status(200).send(false);
        }
      })


});

// 카테고리 정보 가져오기 
app.get('/api/category', (req, res) => {
  db.query('SELECT * FROM productdata', (error, results, fields) => {
 
      res.status(200).send(results);
   
  })

})

// 제품 정보 카테고리 가져오기 
app.get('/api/product', (req, res) => {
  const st = req.query.sort
  const path1 = req.query.path1
  const path2 = req.query.path2
  if(st == 'inch'){
  db.query('SELECT DISTINCT inch FROM productlist WHERE category = ? OR subcategory = ?',[path1,path2], (error, results, fields) => {
      res.status(200).send(results);
   
  })
}else if(st == 'brand'){
  db.query('SELECT DISTINCT brand FROM productlist WHERE category = ? OR subcategory = ?',[path1,path2], (error, results, fields) => {
    res.status(200).send(results);
 
})
}else if(st == 'material'){
  db.query('SELECT DISTINCT material FROM productlist WHERE category = ? OR subcategory = ?',[path1,path2], (error, results, fields) => {
    res.status(200).send(results);
 
})
}else if(st == 'color'){
  db.query('SELECT DISTINCT color FROM productlist WHERE category = ? OR subcategory = ?',[path1,path2], (error, results, fields) => {
    res.status(200).send(results);
 
})
}

})

// 제품 정보 목록 가져오기 
// 1path 기준 
app.get('/api/mainproduct', (req, res) => {
  db.query('SELECT * FROM productlist WHERE category = ?',[req.query.cate], (error, results, fields) => {
    res.status(200).send(results);
 
})

})

//2path 기준
app.get('/api/subproduct', (req, res) => {
  db.query('SELECT * FROM productlist WHERE subcategory = ?',[req.query.subcate], (error, results, fields) => {
    res.status(200).send(results);
 
})

})

//상세
app.get('/api/productdetail', (req, res) => {
  db.query('SELECT * FROM productlist WHERE id = ?',[req.query.id], (error, results, fields) => {
    res.status(200).send(results);
 
})

})

// 전체 
app.get('/api/Allproductdetail', (req, res) => {
  db.query('SELECT * FROM productlist', (error, results, fields) => {
    res.status(200).send(results);

})

})


const path = require('path');
const multer = require('multer');

app.use(express.urlencoded({ extended: false })); // 내부 url 파서 사용
app.use(express.static(path.join(__dirname + '/public'))); // 정적 파일 위치 설정

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads')
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${path.basename(file.originalname, ext)}-${Date.now()}${ext}`);
  }
});

const upload = multer({ storage: storage });

app.post('/api/images', upload.single('img'), (req, res) => {
  // 해당 라우터가 정상적으로 작동하면 public/uploads에 이미지가 업로드된다.
  // 업로드된 이미지의 URL 경로를 프론트엔드로 반환한다.
  console.log('전달받은 파일', req.file);
  console.log('저장된 파일의 이름', req.file.filename);
 

  // 파일이 저장된 경로를 클라이언트에게 반환해준다.
  const IMG_URL = `http://localhost:5000/uploads/${req.file.filename}`;
  console.log(IMG_URL);
  res.json({ url: IMG_URL });
});

app.get('/api/updatename', (req, res) => {

  const Id = req.query.id
const category = req.query.category
const subcategory = req.query.subcategory
const pName = req.query.pName
const pquantity = req.query.pquantity
const pPrice = req.query.pPrice
const inch = req.query.inch
const material = req.query.material
const brand = req.query.brand
const color = req.query.color
console.log(material,'mt')
console.log(pName,'mt')
console.log(material,'mt')
  const sql = 'UPDATE productlist SET category = ?, subcategory = ?, pName = ?, pquantity = ?, pPrice = ?, inch = ?, material = ?, brand = ?, color = ? WHERE id = ? '
  db.query(sql, [category, subcategory, pName, pquantity, pPrice, inch, material, brand, color,Id], (error, results, fields) => {

    console.log('확인됫습니다')
    res.status(200).send(true);
  })
});


// 유저관리
app.get('/api/userlist', (req, res) => {
  db.query('SELECT * FROM userinfo', (error, results, fields) => {
    res.status(200).send(results);
 
})

})

// 게시글 업로드
//썸네일 업로드 
const uploadThumb = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, 'public/thumb_uploads');
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname);

      console.log('file.originalname', file.originalname);
      cb(null, path.basename(file.originalname, ext) + Date.now() + ext);
    },
  }),
});


app.get('/api/uploadproduct', (req, res) => {
  
  db.query('INSERT INTO uploadproduct(title,content) VALUES (?,?) ', [req.query.title,req.query.content], (error, results, fields) => {
    if (error) {
      console.error(error);
      res.status(500).send(false);
      return;
    }

  })
    db.query('INSERT INTO productlist( category,subcategory,pName,pquantity,pPrice,inch,material,brand,color) VALUES (?,?,?,?,?,?,?,?,?) ', [ req.query.category,req.query.subcategory,req.query.pName,req.query.pquantity,req.query.pPrice,req.query.inch,req.query.material,req.query.brand,req.query.color], (error, results, fields) => {
      if (error) {
        console.error(error);
        res.status(500).send(false);
        return;
      }

      res.status(200).send(true);
    });
    
  });



app.post('/api/imagethumb', uploadThumb.array('images', 5), (req, res) => {
  console.log(uploadThumb,'?')
  const IMG_URLs = req.files.map(file => `http://localhost:5000/thumb_uploads/${file.filename}`);
  console.log(IMG_URLs, 'urlrulrulrul');

  res.json({ urls: IMG_URLs });
  db.query("SELECT LAST_INSERT_ID() as id", (error, results) => {
    if (error) {
      console.error(error);
    } else {
      const lastInsertId = results[0].id;
      console.log(lastInsertId,'lastInsertId')
      const sql = `UPDATE productlist SET img1 = ?, img2 = ?, img3 = ?, img4 = ? WHERE id = ?`;
  
      const values = [IMG_URLs[0], IMG_URLs[1], IMG_URLs[2], IMG_URLs[3],lastInsertId];
      db.query(sql, values, (error, results) => {
        if (error) {
          console.error(error);
        }
      });
    }
  });
});



// 게시글 가져오기
app.get('/api/Alluploadlist', (req, res) => {

  db.query('SELECT * FROM uploadproduct',(error, results, fields) => {
  
    res.status(200).send(results);
  })

});

// 특정 게시글 가져오기 
// 게시글 가져오기
app.get('/api/uploadlist', (req, res) => {

  db.query('SELECT * FROM uploadproduct WHERE id = ?',[req.query.id],(error, results, fields) => {
  
    res.status(200).send(results);
  })

});


// 카트추가
app.get('/api/addCart', (req, res) => {
  const data = req.query.data; // 삽입할 데이터 배열
  const userId = req.query.userId
  console.log(data,'data')
  console.log(userId,'userId')
  if(data){
    const query = 'INSERT INTO addcart (productnum, userId, count) VALUES (?, ?, ?)'; 
    data.forEach((item) => {
      db.query(query, [item.id, userId, item.count], (error, results, fields) => {
        if (error) throw error;
        console.log('성공!')
      });
    });

    res.status(200).send(true)
}else{
  console.log('하나일땐 여기! ')
  db.query('INSERT INTO addcart(productnum,userId,count) VALUES (?,?,?) ',[req.query.num,req.query.userId,req.query.counter],(error, results, fields) => {
    console.log(req.query.num,'num')
    console.log(req.query.userId,'userId')
    console.log(req.query.counter,'counter')

    res.status(200).send(true);
  })
}

});


// 카트가져오기

app.get('/api/getCart', (req, res) => {

  db.query('SELECT p.*,a.*  FROM addcart a INNER JOIN productList p ON a.productnum = p.id WHERE a.userId = ?',[req.query.userId],(error, results, fields) => {
    console.log(req.query.userId)
    res.status(200).send(results)
  })

});

// 카트삭제하기(하나씩)
app.get('/api/deleteCart', (req, res) => {
if(req.query.num.length>1){
  const ids = req.query.num; 
const idList = ids.join(',');
const query = `DELETE FROM addcart WHERE productnum IN (${idList});`
  db.query(query,[req.query.num],(error, results, fields) => {
    console.log(req.query.num)
    res.status(200).send(true)
  })
}else{
  db.query('DELETE FROM addcart WHERE productnum = ?',[req.query.num],(error, results, fields) => {
    console.log(req.query.num)
    res.status(200).send(true)
  })
}
  
});


// 니즈 리스트 추가
app.get('/api/addNeeds', (req, res) => {
  const data = req.query.data; // 삽입할 데이터 배열
  const userId = req.query.userId
  if(data){
    const query = 'INSERT INTO needs(productnum,userId,count) VALUES (?,?,?) '; 
    data.forEach((item) => {
      db.query(query, [item.id, userId, item.count], (error, results, fields) => {
        if (error) throw error;
        console.log('성공!')
      });
    });
    
    res.status(200).send(true);
  }else{
    db.query('INSERT INTO needs(productnum,userId,count) VALUES (?,?,?) ',[req.query.num,userId,req.query.counter],(error, results, fields) => {
      console.log(req.query.num,'numnumnum')
      console.log(userId,'ididididid')
      res.status(200).send(true);
    })
  }
});


// 비교데이터 가져오기 


app.get('/api/getcompare', (req, res) => {
  const values = req.query.num
  console.log(req.query.num,'?')
  const query = `SELECT * FROM productlist WHERE id IN (${values.map(val => '?').join(',')})`
  db.query(query,values,(error, results, fields) => {
    console.log(req.query.userId)
    res.status(200).send(results)
  })

});

app.get('/api/getpass', (req, res) => {
  const pass = req.query.pass
  const userId = req.query.userId
  const query = 'SELECT * FROM userinfo WHERE userId = ? AND uPassword = ?'
  db.query(query,[userId,pass],(error, results, fields) => {
    console.log(results)
  if(results[0]){
    res.status(200).send(true)
  }else{
    res.status(200).send(false)
  }
  })


});

// 추천 상품 가져오기 
app.get('/api/recommendlist', (req, res) => {
  db.query('SELECT * FROM productlist WHERE category = ? ORDER BY RAND()LIMIT 5',[req.query.subcate],(error, results, fields) => {
  
    res.status(200).send(results);
  })

});

