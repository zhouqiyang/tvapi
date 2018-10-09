//  OpenShift sample Node application
var express = require('express'),
    app     = express(),
    //morgan  = require('morgan'),
    http    = require('http'),
    fs      = require('fs');
    
//Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
//app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  /*if (mongoURL == null) return;

  var mongodb = require('mongodb');
  var mongodb = null;
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });*/
};

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      if (err) {
        console.log('Error running count. Message:\n'+err);
      }
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});

app.get('/canteen', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      if (err) {
        console.log('Error running count. Message:\n'+err);
      }
      res.render('canteen.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    res.render('canteen.html', { pageCountMessage : null});
  }
});

app.get('/img/:file?', function (req, res, next) {
  //res.send(process.cwd() + '/views/img/' + req.params.file);
  if (req.params.file){
    try{
      var file = fs.readFileSync(process.cwd() + '/views/img/' + req.params.file, 'binary');
      res.writeHead('200', {'Content-Type': 'image/jpeg'});
      res.end(file, 'binary');
    }
    catch(e){
      res.send(e);
    }
  } else {
    next();
  }
});

app.get('/js/:file?', function (req, res, next) {
  //res.send(process.cwd() + '/views/img/' + req.params.img);
  if (req.params.file){
    try{
      var file = fs.readFileSync(process.cwd() + '/views/js/' + req.params.file, 'utf-8');
      res.writeHead('200', {'Content-Type': 'text/javascript'});
      res.end(file, 'utf-8');
    }
    catch(e){
      res.send(e);
    }
  } else {
    next();
  }
});

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});

app.get('/tvapi/decode.do', function (req, res) {
  if (req.query.url){
      var url = req.query.url;
      url = url.replace("http://", "").replace("https://", "");
      var host = url.match(/[^\/]*/)[0];
      var path = url.match(/[\/|\?].*$/)[0];
      if (path == ""){
        res.writeHead('200', {'Content-Type': 'application/json'});
        res.end("{error:1,message:\"视频地址格式错误。\"}", 'utf-8');
        return;
      }
      /*else {
            res.writeHead('200', {'Content-Type': 'application/json'});
            res.end("{host:\"" + host + "\",path:\"" + path + "\"}", 'utf-8');
            return;
      }*/
    try{
        var options = {
            host: host,
            port: 80,
            path: path,
            method:"GET"
        };
        http.request(options, function(r){
            r.setEncoding("utf-8");
            var s = "";
            r.on("data",function(chunk){
                s += chunk;
            }).on("end",function(){
                //根据正则表达式检索返回html中的链接地址
                var match = s.match(/video.php\?.+?(?=")/g);
                if (match.length == 0){
                    res.writeHead('200', {'Content-Type': 'application/json'});
                    res.end("{error:2,message:\"该视频不能解析。\"}", 'utf-8');
                    return;
                }
                s = match[0];
                
                if (s == ""){
                    res.writeHead('200', {'Content-Type': 'application/json'});
                    res.end("{error:3,message:\"获取视频地址失败。\"}", 'utf-8');
                    return;
                }
                //---------------------------------------------------------------
                //第二次转换
                options = {
                        host: host,
                        port: 80,
                        path: "/" + s,
                        method:"GET"
                    };
                http.request(options, function(r){
                    r.setEncoding("utf-8");
                    s = "";
                    r.on("data",function(chunk){
                        s += chunk;
                    }).on("end",function(){
                        //根据正则表达式检索返回html中的链接地址
                        //var match = s.match(/video.php\?.+?(?=")/g);
                        //s = match[0];
                        //res.writeHead('200', {'Content-Type': 'application/json'});
                        //res.end(s, 'utf-8');
                    	var json = JSON.parse(s);
                    	if (json.appfu != ""){
                    	    res.redirect(302, json.appfu);
                    	}else{
                            res.writeHead('200', {'Content-Type': 'application/json'});
                            res.end(s, 'utf-8');
                    	}
                    });
                }).on("error",function(err){
                    res.writeHead('200', {'Content-Type': 'application/json'});
                    res.end("{error:5,message:\"" + err + "\"}", 'utf-8');
                }).end();
                //---------------------------------------------------------------
            });
        }).on("error",function(err){
            res.writeHead('200', {'Content-Type': 'application/json'});
            res.end("{error:6,message:\"" + err + "\"}", 'utf-8');
        }).end();
    }
    catch(e){
      res.send(e);
    }
  } else {
    next();
  }
});

app.get('/tvapi/:file?', function (req, res) {
  if (req.params.file){
    try{
      var file = fs.readFileSync(process.cwd() + '/json/' + req.params.file, 'utf-8');
      res.writeHead('200', {'Content-Type': 'application/json'});
      res.end(file, 'utf-8');
    }
    catch(e){
      res.send(e);
    }
  } else {
    next();
  }
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app;
