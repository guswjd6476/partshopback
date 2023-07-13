const express = require('express');
const db = require("./DB.js"); //database 
const fs = require('fs')
const app = express();
const mailer = require('./mail');
const axios = require('axios')
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
let deliverData = [];

async function updateJsonData(data, productnum) {
  try {
    // 데이터베이스 업데이트
    const progresses = data.progresses;
    const progressValues = progresses.map((progress) => [
      progress.time,
      progress.location.name,
      progress.status.text,
      data.number,
      data.carrier.name,
      progress.time + data.number,
    ]);

    const progressQuery =
      'INSERT INTO deliverlist (time, location, status, delivernum, carrier, dupnum) VALUES ? ON DUPLICATE KEY UPDATE dupnum = VALUES(dupnum)';

    await new Promise((resolve, reject) => {
      db.query(progressQuery, [progressValues], (progressError, progressResults) => {
        if (progressError) {
          reject(progressError);
        } else {
          console.log('Progress updated:', progressResults);
          resolve();
        }
      });
    });

    // ALTER TABLE 문은 한 번만 실행하도록 처리
    const alterQuery = 'ALTER TABLE deliverlist ADD UNIQUE INDEX (dupnum)';

    await new Promise((resolve, reject) => {
      db.query(alterQuery, (alterError, alterResults) => {
        if (alterError) {
          reject(alterError);
        } else {
          console.log('ALTER TABLE executed:', alterResults);
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

// API를 통해 데이터 가져오고 데이터베이스 업데이트
async function updateDataFromAPI(productnum, carrier, number) {
  try {
    const apiEndpoint = `https://apis.tracker.delivery/carriers/${carrier}/tracks/${number}`;
    const response = await axios.get(apiEndpoint);
    const data = response.data;
    console.log('Data fetched:', data);

    // 데이터베이스 연결
    db.connect((err) => {
      if (err) {
        console.error('Error connecting to database:', err);
        return;
      }
      console.log('Connected to database');
      updateJsonData(data, productnum);
    });
  } catch (error) {
    console.error('Error fetching data from API:', error);
  }
}

// deliverData 처리
async function processDeliverData() {
  try {
    const query = 'SELECT * FROM buylist';

    const [rows] = await db.promise().execute(query);

    deliverData = rows.map((row) => ({
      productnum: row.productnum,
      carrier: row.carrier,
      number: row.dNum,
    }));

    for (const data of deliverData) {
      console.log(deliverData, 'deliverdata');
      await updateDataFromAPI(data.productnum, data.carrier, data.number);
    }
  } catch (error) {
    console.error('Error processing deliverData:', error);
  }
}

// deliverData 처리
processDeliverData();
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
  db.query( 'SELECT p.*,a.*  FROM productdata a INNER JOIN category p ON a.catenum = p.catenum', (error, results, fields) => {
      res.status(200).send(results);
  })
})
// 메인 페스만 가져오기
app.get('/api/Maincategory', (req, res) => {
  db.query( 'SELECT *  FROM category', (error, results, fields) => {
      res.status(200).send(results);
  })
})

// 제품 정보 카테고리 가져오기 
app.get('/api/product', (req, res) => {
  const st = req.query.sort
  const path = req.query.path
  if(st == 'inch'){
    db.query('SELECT DISTINCT pl.inch FROM productlist AS pl JOIN category AS c ON c.catenum = pl.catenum  JOIN productdata AS pd ON pd.subcatenum = pl.subcatenum WHERE pd.subcategory = ?  OR c.category = ?', [path,path], (error, results, fields) => {
      res.status(200).send(results);
  })
}else if(st == 'brand'){
  db.query('SELECT DISTINCT pl.brand FROM productlist AS pl JOIN category AS c ON c.catenum = pl.catenum  JOIN productdata AS pd ON pd.subcatenum = pl.subcatenum WHERE pd.subcategory = ?  OR c.category = ?', [path,path], (error, results, fields) => {
    res.status(200).send(results);
})
}else if(st == 'material'){
  db.query('SELECT DISTINCT pl.material FROM productlist AS pl JOIN category AS c ON c.catenum = pl.catenum  JOIN productdata AS pd ON pd.subcatenum = pl.subcatenum WHERE pd.subcategory = ?  OR c.category = ?', [path,path], (error, results, fields) => {
    res.status(200).send(results);
})
}else if(st == 'color'){
  db.query('SELECT DISTINCT pl.color FROM productlist AS pl JOIN category AS c ON c.catenum = pl.catenum  JOIN productdata AS pd ON pd.subcatenum = pl.subcatenumWHERE pd.subcategory = ?  OR c.category = ?', [path,path], (error, results, fields) => {
    res.status(200).send(results);
})
}

})

// 제품 정보 목록 가져오기 
// 1path 기준 
app.get('/api/getproduct', (req, res) => {
  const other = req.query.none
  if(other) {
    db.query('SELECT pl.*,c.category,pd.subcategory FROM iotlist AS pl JOIN category AS c ON  pl.catenum = c.catenum  JOIN productdata AS pd ON pd.subcatenum = pl.subcatenum  WHERE c.category = ? or pd.subcategory = ?',[req.query.cate,req.query.cate], (error, results, fields) => {
      res.status(200).send(results);
  
  })
  }else{
    db.query('SELECT pl.*,c.category,pd.subcategory FROM  productlist AS pl JOIN category AS c ON  pl.catenum = c.catenum  JOIN productdata AS pd ON pd.subcatenum = pl.subcatenum  WHERE c.category = ? or pd.subcategory = ?',[req.query.cate,req.query.cate], (error, results, fields) => {
      res.status(200).send(results);
  })
  }


})
;



//상세
app.get('/api/productdetail', (req, res) => {
  db.query('SELECT p.*,c.category,pd.subcategory FROM productlist AS p INNER JOIN category AS c ON  p.catenum = c.catenum JOIN productdata AS pd ON  p.subcatenum = pd.subcatenum  WHERE p.id = ?',[req.query.id], (error, results, fields) => {
    res.status(200).send(results);

})

})
// 전체 

app.get('/api/Allproductdetail', (req, res) => {
  db.query('SELECT pl.*,c.category,pd.subcategory FROM  productlist AS pl JOIN category AS c ON  pl.catenum = c.catenum  JOIN productdata AS pd ON pd.subcatenum = pl.subcatenum ', (error, results, fields) => {
    res.status(200).send(results);

})

})
// 전체 

app.get('/api/Alliotlist', (req, res) => {
  db.query('SELECT pl.*,c.category,pd.subcategory FROM  iotlist AS pl JOIN category AS c ON  pl.catenum = c.catenum  JOIN productdata AS pd ON pd.subcatenum = pl.subcatenum ORDER BY updatetime DESC LIMIT 5', (error, results, fields) => {
    res.status(200).send(results);

})

})

// 이벤트 가져오기
app.get('/api/getevent', (req, res) => {
  db.query('SELECT * FROM event ORDER BY updatetime DESC', (error, results, fields) => {
    res.status(200).send(results);

})

})
// 이벤트 가져오기
app.get('/api/getsubevent', (req, res) => {
  db.query('SELECT * FROM event WHERE id = ?',[req.query.id], (error, results, fields) => {
    res.status(200).send(results);

})

})

const path = require('path');
const multer = require('multer');

app.use(express.urlencoded({ extended: false })); // 내부 url 파서 사용
app.use(express.static(path.join(__dirname + '/public'))); // 정적 파일 위치 설정

const storage = multer.diskStorage({

  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, path.basename(file.originalname, ext) + ext);
  }
});

const upload = multer({ storage: storage });
// 게시글 업로드
//썸네일 업로드 
const uploadThumb = multer({
  storage: multer.diskStorage({
  
    filename(req, file, cb) {
      const ext = path.extname(file.originalname);

      console.log('file.originalname', file.originalname);
      cb(null, path.basename(file.originalname, ext) + ext);
    },
  }),
});

app.post('/api/images', uploadThumb.single('img'), (req, res) => {

  console.log('전달받은 파일', req.file);
  console.log('저장된 파일의 이름', req.file.filename);
  // 파일이 저장된 경로를 클라이언트에게 반환해준다.
  const IMG_URL = `https://guswjd6476.speedgabia.com/thumb/${req.file.filename}`;
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
// 특정유저 정보
app.get('/api/getUser', (req, res) => {
  db.query('SELECT * FROM userinfo WHERE userId = ?',[req.query.userId], (error, results, fields) => {
    res.status(200).send(results);
})
})
// 유저가 등록한 배송지
app.get('/api/getAddress', (req, res) => {
  db.query('SELECT * FROM address WHERE userId = ?',[req.query.userId], (error, results, fields) => {
    console.log(req.query.userId,'요청된 배송지ㅑㅇ')
    res.status(200).send(results);
})
})
// 추가한 배송지
app.get('/api/addAddress', (req, res) => {
  db.query('INSERT INTO address(userId,address,addtype,addressnum,subaddress,uName,uPhone) VALUES (?,?,?,?,?,?,?) ',[req.query.userId,req.query.address,req.query.addtype,req.query.addressnum,req.query.subaddress,req.query.uName,req.query.uPhone], (error, results, fields) => {
    res.status(200).send(results);
})
})
// 배송지선택
app.get('/api/selectAddress', (req, res) => {
  db.query('UPDATE address SET selected = CASE WHEN id = ? THEN 1 ELSE 0 END', [req.query.num], (error, results, fields) => {
    console.log(req.query.num,'아이디')
    if (error) {
      // 오류 처리
      console.error(error);
      res.status(500).send(false);
      return;
    }
  
    res.status(200).send(true);
  });
})

const fileUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, 'public/file_uploads');
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname);
      const decodedFileName = decodeURIComponent(file.originalname);
      cb(null, path.basename(decodedFileName, ext));
    },
  }),
});


app.get('/api/uploadproduct', (req, res) => {
  console.log(req.query.catenum,'catenum')
 const cost =  Number(req.query.pPrice) * (100 - req.query.dcrate)/100 
 if(req.query.catenum !== '3' &&req.query.catenum !== '4' ){
    db.query('INSERT INTO productlist( title,content,catenum,subcatenum,pName,pquantity,pCost,inch,material,brand,color,dcrate,moq,prepare,pDetail,pPrice) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ', [req.query.title,req.query.content,req.query.catenum,req.query.subcatenum,req.query.pName,req.query.pquantity,req.query.pPrice,req.query.inch,req.query.material,req.query.brand,req.query.color,req.query.dcrate,req.query.moq,req.query.prepare,req.query.detail,cost], (error, results, fields) => {
      if (error) {
        console.error(error);
        res.status(500).send(false);
        return;
      }

      res.status(200).send(true);
    });
  }else if(req.query.catenum == '4'){
    db.query('INSERT INTO event( title,content,startday,lastday) VALUES (?,?,?,?) ', [ req.query.title,req.query.content, req.query.startday,req.query.lastday], (error, results, fields) => {
      if (error) {
        console.error(error);
        res.status(500).send(false);
        return;
      }
      res.status(200).send(true);
    });
  
  }else{
    db.query('INSERT INTO iotlist( title,content,catenum,subcatenum,pName,brand,pDetail) VALUES (?,?,?,?,?,?,?) ', [ req.query.title,req.query.content, req.query.catenum,req.query.subcatenum,req.query.pName,req.query.brand,req.query.detail], (error, results, fields) => {
      if (error) {
        console.error(error);
        res.status(500).send(false);
        return;
      }
      res.status(200).send(true);
    });
  }
    
  });



app.post('/api/imagethumb', uploadThumb.array('images', 6), (req, res) => {
  console.log(uploadThumb,'?')
  console.log(req.files)
  const IMG_URLs = req.files.map(file => `https://guswjd6476.speedgabia.com/thumb/${file.filename}`);
  console.log(IMG_URLs, 'urlrulrulrul');

  res.json({ urls: IMG_URLs });
  db.query("SELECT LAST_INSERT_ID() as id", (error, results) => {
    if (error) {
      console.error(error);
    } else {
      const lastInsertId = results[0].id;
      console.log(lastInsertId,'lastInsertId')
      const sql = `UPDATE productlist SET img1 = ?, img2 = ?, img3 = ?, img4 = ?, img5 = ?  WHERE id = ?`;
  
      const values = [IMG_URLs[0], IMG_URLs[1], IMG_URLs[2], IMG_URLs[3],IMG_URLs[4], lastInsertId];
      db.query(sql, values, (error, results) => {
        if (error) {
          console.error(error);
        }
      });
    }
  });
});
app.post('/api/imagethumbs', uploadThumb.array('images', 6), (req, res) => {
  const IMG_URLs = req.files.map(file =>`https://guswjd6476.speedgabia.com/thumb/${file.filename}`);
  res.json({ urls: IMG_URLs });
  db.query("SELECT LAST_INSERT_ID() as id", (error, results) => {
    if (error) {
      console.error(error);
    } else {
      const lastInsertId = results[0].id;
      console.log(lastInsertId,'lastInsertId')
      const sql = `UPDATE iotlist SET thumb = ? WHERE id = ?`;
      const values = [IMG_URLs[0],lastInsertId];
      db.query(sql, values, (error, results) => {
        if (error) {
          console.error(error);
        }
      });
    }
  });
});
app.post('/api/eventthumbs', uploadThumb.array('images', 6), (req, res) => {
  const IMG_URLs = req.files.map(file =>`https://guswjd6476.speedgabia.com/thumb/${file.filename}`);
  res.json({ urls: IMG_URLs });
  db.query("SELECT LAST_INSERT_ID() as id", (error, results) => {
    if (error) {
      console.error(error);
    } else {
      const lastInsertId = results[0].id;
      console.log(lastInsertId,'lastInsertId')
      const sql = `UPDATE event SET thumb = ? WHERE id = ?`;
      const values = [IMG_URLs[0],lastInsertId];
      db.query(sql, values, (error, results) => {
        if (error) {
          console.error(error);
        }
      });
    }
  });
});


app.post('/api/fileboard', fileUpload.array('files'), (req, res) => {

  const IMG_URLs = req.files.map(file => `https://guswjd6476.speedgabia.com//file_uploads/${file.filename}`);
  console.log(IMG_URLs, 'urlrulrulrul');

  res.json({ urls: IMG_URLs });
  db.query("SELECT LAST_INSERT_ID() as id", (error, results) => {
    if (error) {
      console.error(error);
    } else {
      const lastInsertId = results[0].id;
      console.log(lastInsertId,'lastInsertId')
      const sql = `UPDATE iotlist SET file1 = ?, file2 = ?, file3 = ?, file4 = ? WHERE id = ?`;
      const values = [IMG_URLs[0], IMG_URLs[1], IMG_URLs[2], IMG_URLs[3], lastInsertId];
      console.log(values,'v')
      db.query(sql, values, (error, results) => {
        if (error) {
          console.error(error);
        }
      });
    }
  });
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

  db.query('SELECT p.*,a.*  FROM addcart AS a INNER JOIN productlist AS p ON a.productnum = p.id WHERE a.userId = ?',[req.query.userId],(error, results, fields) => {
    console.log(req.query.userId)
    res.status(200).send(results)
    console.log(results,'cart')
  })

});

// 카트삭제하기(하나씩)
app.get('/api/deleteCart', (req, res) => {
if(Array.isArray(req.query.num) && req.query.num.length>1){
  const ids = req.query.num; 
const idList = ids.join(',');
const query = `DELETE FROM addcart WHERE productnum IN (${idList});`
  db.query(query,[req.query.num],(error, results, fields) => {
    console.log(req.query.num)
    res.status(200).send(true)
  })
}
else{
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
  if(req.query.num[0]){
  const values = (req.query.num[0]&&req.query.num[0].productnum&&req.query.num.map(value => value.productnum))|| req.query.num
  const query = `SELECT * FROM productlist WHERE id IN (${values.map(val => '?').join(',')})`
  db.query(query,values,(error, results, fields) => {
    console.log(req.query.userId)
    res.status(200).send(results)
  })
}
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
  db.query('SELECT pl.*,c.category,pd.subcategory FROM productlist AS pl JOIN category AS c ON  pl.catenum = c.catenum JOIN productdata AS pd ON pd.subcatenum = pl.subcatenum WHERE c.category = ? AND pl.id != ? ORDER BY RAND()LIMIT 5',[req.query.subcate,req.query.num],(error, results, fields) => {
  
    res.status(200).send(results);
  })

});

// 카테고리 추가하기
app.get('/api/addMainCate', (req, res) => {
const data = req.query.cates; 
console.log(data,'data')
console.log('main')
const query = 'INSERT INTO category(category,catenum) VALUES (?,?) ON DUPLICATE KEY UPDATE category = VALUES(category)'
data.forEach((item) => {
  db.query(query, [item.category, item.catenum], (error, results, fields) => {
    if (error) throw error;
  });
});
res.status(200).send(true);
  })


  
  // 카테고리 추가하기(sub)
  app.get('/api/addCates', (req, res) => {
    const cate = req.query.cate
    const cates = req.query.cates; 
    console.log('sub')
    const query = 'INSERT INTO productdata (catenum, subcategory, subcatenum) VALUES (?,?,?) ON DUPLICATE KEY UPDATE catenum = VALUES(catenum), subcategory = VALUES(subcategory);'
    const querys = 'INSERT INTO category(category,catenum) VALUES (?,?) ON DUPLICATE KEY UPDATE category = VALUES(category)'

    console.log(cate,'?')
    if(cate){
    cate&&cate.forEach((item) => {
      db.query(query, [item.catenum, item.subcategory,item.subcatenum], (error, results, fields) => {
        if (error) throw error;
    
      });
    });
  }
  if(cates){
    cates.forEach((item) => {
    db.query(querys, [item.category, item.catenum], (error, results, fields) => {
      if (error) throw error;
  
    });
    
  });
}
        res.status(200).send(true);
      })
  
      

// 카테고리 삭제하기(메인)
app.get('/api/dMainCate', (req, res) => {
  db.query('DELETE FROM category WHERE catenum = ?',[req.query.num],(error, results, fields) => {
    console.log(req.query.num,'???')
  })
  db.query('DELETE FROM productdata WHERE catenum = ?',[req.query.num],(error, results, fields) => {
    console.log(req.query.num,'???')
  })
  
  res.status(200).send(true);

});

// 카테고리 삭제하기(서브)
app.get('/api/dSubCate', (req, res) => {
  db.query('DELETE FROM productdata WHERE subcatenum = ?',[req.query.num],(error, results, fields) => {
    console.log(req.query.num,'???')
    res.status(200).send(true);
  })

});

// 전체 게시물 가져오기 
app.get('/api/getAllItem', (req, res) => {
  const path = req.query.path
  const sql = path === 'notice' ? 'SELECT * FROM notice' :  path === 'qna' ? 'SELECT * FROM qna' :'SELECT * FROM faq'
  db.query(sql,(error, results, fields) => {
    res.status(200).send(results);
  })
});

// 공지사항 작성하기
app.get('/api/writenotice', (req, res) => {
  db.query('INSERT INTO notice(title,content,writer,category) VALUES (?,?,?,?) ', [req.query.title,req.query.content,req.query.writer,req.query.category], (error, results, fields) => {
    if (error) {
      console.error(error);
      res.status(500).send(false);
      return;
    }
    res.status(200).send(true);
  })
});
// 게시물 수정하기 
app.get('/api/updateItem', (req, res) => {
  const path = req.query.path
  console.log(path,'path')
  const sql =  path === 'notice' ? 'UPDATE notice SET title =?, content = ?, category = ?  WHERE id = ?' : 'UPDATE qna SET title =?, content = ?, category = ?  WHERE id = ?'

  db.query(sql, [req.query.title,req.query.content,req.query.category,req.query.id], (error, results, fields) => {
    if (error) {
      console.error(error);
      res.status(500).send(false);
      return;
    }
    res.status(200).send(true);
  })
});


// 특정 게시물 가져오기 
app.get('/api/getItemcon', (req, res) => {
  const path = req.query.path
  const sql = path==='notice' ? 'SELECT * FROM notice WHERE id = ?' : 'SELECT * FROM qna WHERE id = ?'
  db.query(sql,[req.query.num],(error, results, fields) => {
    res.status(200).send(results);
  })

});
// 특정 게시물 가져오기 2
app.get('/api/getwriteQna', (req, res) => {
  const sql = 'SELECT * FROM qna WHERE writer = ?'
  db.query(sql,[req.query.writer],(error, results, fields) => {
    res.status(200).send(results);
  })

});
// 게시물 삭제하기
app.get('/api/dItem', (req, res) => {
  const path = req.query.path
  const sql = path ==='notcie' ? 'DELETE FROM notice WHERE id = ?' : path ==='qna' ? 'DELETE FROM qna WHERE id = ?' : 'DELETE FROM faq WHERE id = ?'

  db.query(sql,[req.query.id],(error, results, fields) => {
    console.log(req.query.num,'???')
    res.status(200).send(true);
  })

});

// qna 작성하기
app.get('/api/writeqna', (req, res) => {
  db.query('INSERT INTO qna(title,content,writer,category) VALUES (?,?,?,?) ', [req.query.title,req.query.content,req.query.writer,req.query.category], (error, results, fields) => {
    if (error) {
      console.error(error);
      res.status(500).send(false);
      return;
    }
    res.status(200).send(results);
  })
});
// qna 답변 작성하기
app.get('/api/writeqnaanswer', (req, res) => {
  db.query('UPDATE qna SET answer=? ,answerwriter=? WHERE id = ? ', [req.query.content,req.query.writer,req.query.num], (error, results, fields) => {
    console.log(req.query.content)
    console.log(req.query.num)
    if (error) {
      console.error(error);
      res.status(500).send(false);
      return;
    }
    res.status(200).send(true);
  })
});




// faq 작성하기
app.get('/api/writefaq', (req, res) => {
  db.query('INSERT INTO faq(title,content,writer,category) VALUES (?,?,?,?) ', [req.query.title,req.query.content,req.query.writer,req.query.category], (error, results, fields) => {
    console.log(req.query.title)
    console.log(req.query.content)
    console.log(req.query.category)
    if (error) {
      console.error(error);
      res.status(500).send(false);
      return;
    }
    res.status(200).send(results);
  })
});


// 이전 글 가져오기 
app.get('/api/prevNext', (req, res) => {
  const num = Number(req.query.num);
  const id = req.query.id
  const sql = 
  id === 'notice' ? 
  'SELECT * FROM notice WHERE id IN ((SELECT id FROM notice WHERE id < ? ORDER BY id DESC LIMIT 1),(SELECT id FROM notice WHERE id > ? ORDER BY id ASC LIMIT 1))'
  :id === 'qna' ?  'SELECT * FROM qna WHERE id IN ((SELECT id FROM qna WHERE id < ? ORDER BY id DESC LIMIT 1),(SELECT id FROM qna WHERE id > ? ORDER BY id ASC LIMIT 1))'
  :  'SELECT * FROM event WHERE id IN ((SELECT id FROM event WHERE id < ? ORDER BY id DESC LIMIT 1),(SELECT id FROM qna WHERE id > ? ORDER BY id ASC LIMIT 1))'
  ;
  db.query(sql, [num, num], (error, results, fields) => {
    if (error) {
      console.error('Error executing SQL query:', error);
      res.status(500).send('An error occurred');
      return;
    }
    res.status(200).send(results);
  });
});

//메인 컨트롤 
app.get('/api/updatemain', (req, res) => {
  const a1= req.query.a1;const a2= req.query.a2;const a3= req.query.a3;const a4= req.query.a4;const a5= req.query.a5;const a6= req.query.a6;const a7= req.query.a7;const a8= req.query.a8;const a9= req.query.a9;const a10= req.query.a10
  const b1= req.query.b1;const b2= req.query.b2;const b3= req.query.b3;const b4= req.query.b4;const b5= req.query.b5;const b6= req.query.b6;const b7= req.query.b7;const b8= req.query.b8;const b9= req.query.b9;const b10= req.query.b10

  db.query('UPDATE maincontrol SET p1=?, p2=?, p3=?, p4=?, p5=?, p6=?, p7=?, p8=?,p9=?,p10=? WHERE main = ?',[a1, a2, a3, a4, a5, a6, a7, a8,a9,a10 ,'mainA'],
    (error, results, fields) => {
      if (error) {
        console.error(error);
        res.status(500).send(false);
        return;
      }
      db.query(
        'UPDATE maincontrol SET p1=?, p2=?, p3=?, p4=?, p5=?, p6=?, p7=?, p8=?,p9=?,p10=?  WHERE main = ?',
        [b1, b2, b3, b4, b5, b6, b7, b8,b9,b10 ,'mainB'],
        (error, results, fields) => {
          if (error) {
            console.error(error);
            res.status(500).send(false);
            return;
          }
          res.status(200).send(true);
        }
      );
    }
  );
})

// 메인 데이터 가져오기

app.get('/api/getmain', (req, res) => {
  db.query('SELECT * FROM maincontrol', (error, results, fields) => {
    res.status(200).send(results);
 
})

})
// 모든주문목록 불러오기 
app.get('/api/getAllOrderlist', (req, res) => {
  db.query('SELECT p.*,a.*  FROM buylist AS a INNER JOIN productlist AS p ON a.productnum = p.id', (error, results, fields) => {
    res.status(200).send(results);
 
})

})
// 주문목록 불러오기 
app.get('/api/getOrderlist', (req, res) => {
  db.query('SELECT p.*,a.*  FROM buylist AS a INNER JOIN productlist AS p ON a.productnum = p.id WHERE a.userId = ?',[req.query.userId], (error, results, fields) => {
    res.status(200).send(results);
 
})

})

// 주문후기목록 불러오기 
app.get('/api/getAfterbuylist', (req, res) => {
  db.query('SELECT p.*,a.*  FROM afterbuy AS a INNER JOIN productlist AS p ON a.productnum = p.id WHERE a.userId = ?',[req.query.userId], (error, results, fields) => {
    res.status(200).send(results);
 
})

})

// 주문후기 작성하기 
app.get('/api/addAfeterbuylist', (req, res) => {
  db.query('INSERT INTO afterbuy(productnum,userId,title,rate,content) VALUES (?,?,?,?,?) ',[req.query.num,req.query.userId,req.query.title,req.query.rate,req.query.content], (error, results, fields) => {
    res.status(200).send(true);
})
})
// 주문후기 페이지에 나타내기
app.get('/api/getThisAfterbuylist', (req, res) => {
  db.query('SELECT p.*,a.*  FROM afterbuy AS a INNER JOIN productlist AS p ON a.productnum = p.id WHERE a.productnum = ?',[req.query.num], (error, results, fields) => {
    res.status(200).send(results);
 
})

})

// 운송장등록 /api/addDeliver
app.get('/api/addDeliver', (req, res) => {
  db.query('UPDATE buylist SET buystate = ?, dNum = ? ,carrier = ? WHERE id = ? ', [req.query.state,req.query.dNum,req.query.carriers,req.query.id], (error, results, fields) => {
   console.log(req.query.state,req.query.dNum,req.query.carriers,req.query.id)
    if (error) {
      // 오류 처리
      console.error(error);
      res.status(500).send(false);
      return;
    }
  
    res.status(200).send(true);
  });
})


// 찜목록 가져오기
app.get('/api/getNeeds', (req, res) => {
  db.query('SELECT p.catenum,p.subcatenum,p.pName,p.pPrice,p.img1,p.pDetail,a.*,c.category,pd.subcategory FROM needs AS a INNER JOIN productlist AS p ON a.productnum = p.id  JOIN category AS c ON  p.catenum = c.catenum JOIN productdata AS pd ON  p.subcatenum = pd.subcatenum  WHERE a.userId = ?',[req.query.userId], (error, results, fields) => {
    console.log(req.query.userId,'?')
    res.status(200).send(results);
})
})
// 찜목록 지우기
app.get('/api/deleteNeeds', (req, res) => {
  db.query('DELETE FROM needs WHERE id = ?',[req.query.num],(error, results, fields) => {

  })
  
  res.status(200).send(true);

});
// 문의사항 작성하기 
app.get('/api/addinquiry', (req, res) => {
  const answer = req.query.type === 1 ? null : req.query.answerid
  db.query('INSERT INTO addinquiry(productnum,userId,content,category,type,answerid) VALUES (?,?,?,?,?,?) ',[req.query.num,req.query.userId,req.query.content,req.query.category,req.query.type,answer], (error, results, fields) => {
    res.status(200).send(true);
})
})


app.get('/api/getinquiry', (req, res) => {
  db.query('SELECT p.*,a.*  FROM addinquiry AS a INNER JOIN productlist AS p ON a.productnum = p.id WHERE a.productnum = ?',[req.query.num], (error, results, fields) => {
    res.status(200).send(results);
})
})