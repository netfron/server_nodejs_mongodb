//기본 모듈 불러오기
var http = require('http');
var express = require('express');
var app = express();

var router = express.Router();
var bodyParser = require('body-parser');
var static = require('serve-static');
var path = require('path');

var cookieParser = require('cookie-parser');
var expressSession = require('express-session');

//몽고디비 관련 모듈
var mongoose = require("mongoose");

app.set('port', process.env.PORT || 3000);

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
 
// parse application/json
app.use(bodyParser.json());

app.use('/public', static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(expressSession({
    secret: 'my key',
    resave: true,
    saveUninitialized: true
}));

// 몽고DB 관련 전역변수
var db;
var Users;
function connectDB() {
    var dbUrl = "mongodb://localhost/MyApp";
    mongoose.connect(
        dbUrl,{ useNewUrlParser: true }, function(err, client){
            if(err){
                console.log(err);
            }
            else {
                console.log('connected to '+ dbUrl);
                //mongoose.Promise = global.Promise;
                db = mongoose.connection;
                db.on('error', console.error.bind(console, 'connection error:'));
                db.once('open', function() {});                
                //db = client.db('MyApp');
            }
    });
    
    //load model
    Users = require('./models/users');

}

//라우터를 이용한 패스 요청 처리
router.route('/').get(function (req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html;charset=utf8'
    });
    res.write('<h2>노드js 서버 실행 중 ...</h2>');
    res.end();
});

router.route('/process/product').get(function (req, res) {
    console.log('/process/product 요청 들어 옴...');

    if (req.session.user === undefined) {
        console.log("로그인 안됨");
        res.redirect('/public/login.html');
    } else {
        console.log("로그인 됨");
        res.redirect('/public/product.html');
    }
});

var authUser = function (id, password, callback) {
    console.log('authUser 호출됨.', id, password);
    
    Users.find({"id":id,"password":password}).exec(function(err, result) {

        if (err) callback(err, null);
        if (result.length > 0) {
            console.log('아이디 [%s], 비밀번호 [%s]가 있다.', id, password);
            callback(null, result);
        } else {
            console.log('사용자가 없다');
            callback(null, null);
        }
    });

};


router.route('/process/login').post(function (req, res) {
    console.log('/process/login 요청 들어 옴...');

    var paramId = req.body.id;
    var paramPassword = req.body.password;

    if (req.session.user) {
        console.log('이미 로그인 되어 상품 페이지로 이동 함.');
        res.redirect('/public/product.html');
    } else {
        if (db) {
            authUser(paramId, paramPassword, function (err, docs) {
                if (err) {
                    throw err;
                }

                if (docs) {
                    console.dir(docs);
                    var username = docs[0].name;

                    userObj = {
                        id: paramId,
                        name: username,
                        authorized: true
                    };
                    req.session.user = userObj;

                    res.writeHead('200', {
                        'Content-Type': 'text/html;charset=utf8'
                    });
                    res.write('<h1>로그인 성공</h1>');
                    res.write('<p>' + username + ' / ' + paramId + '</p>');
                    res.write('<a href="/public/login.html">다시 로그인 하기</a>');
                    res.end();
                } else {
                    res.writeHead('200', {
                        'Content-Type': 'text/html;charset=utf8'
                    });
                    res.write('<h1>로그인 실패</h1>');
                    res.write('<a href="/public/login.html">다시 로그인 하기</a>');
                    res.end();
                }
            });
        } else {
            res.writeHead('200', {
                'Content-Type': 'text/html;charset=utf8'
            });
            res.write('<h1>데이터 베이스 연결 실패</h1>');
            res.end();
        }

    }
});

router.route('/process/logout').get(function (req, res) {
    console.log('/process/logout 요청 들어 옴...');
    if (req.session.user) {
        req.session.destroy(function (err) {
            if (err) {
                throw err;
            }
            console.log('로그아웃 되었다.');
        });
    } else {
        console.log('아직 로그인 안됨.');
    }
    res.redirect('/public/login.html');
});

var addUser = function (database, id, password, name, callback) {
    console.log('addUser 함수 오출 됨: %s, %s, %s', id, password, name);

    var User = new Users({
        id: id,
        name: name,
        password: password,
    });

    User.save(function (err, result) {
        if (err) return callback(err, []);
        callback(null, result);
    });

};

router.route('/process/adduser').post(function (req, res) {
    console.log('/process/adduser 호출 됨');

    var paramId = req.body.id || req.query.id;
    var paramPassword = req.body.password || req.query.password;
    var paramName = req.body.name || req.query.name;

    console.log('요청 파라미터 : %s, %s, %s', paramId, paramPassword, paramName);

    if (db) {
        addUser(db, paramId, paramPassword, paramName, function (err, result) {
            if (err) {
                throw err;
            }

            if (result && result.insertedCount > 0) {
                console.dir(result);
                res.writeHead('200', {
                    'Content-Type': 'text/html;charset=utf8'
                });
                res.write('<h1>사용자 추가 성공</h1>');
                res.end();
            } else {
                res.writeHead('200', {
                    'Content-Type': 'text/html;charset=utf8'
                });
                res.write('<h1>사용자 추가 실패</h1>');
                res.end();
            }
        });
    } else {
        res.writeHead('200', {
            'Content-Type': 'text/html;charset=utf8'
        });
        res.write('<h1>데이터 베이스 연결 실패</h1>');
        res.end();
    }

});


//라우터 미들웨어 등록
app.use('/', router);
//서버 객체 생성
var server = http.createServer(app);
server.listen(app.get('port'), function () {
    console.log('http://localhost:%d', app.get('port'));
    connectDB();
});
