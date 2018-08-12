const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('node-uuid');
const path = require('path');

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE");
    next();
});

var listPath = path.resolve(__dirname, 'liste.json');

var list;

// Initialisierung
if (fs.existsSync(listPath))
	list = require(listPath);
else
	list = {Name: 'Einkaufsliste',
		Items: []};


function addToList(newItem) {
	if (newItem.Product == null)
		return;

	newItem.Product = newItem.Product.trim();
	var amount = parseInt(newItem.Amount);
	if (isNaN(amount))
		newItem.Unit = undefined;
	else
		if (newItem.Unit == null || newItem.Unit == undefined)
			newItem.Unit = "St.";
	
	for (var i = 0; i < list.Items.length; i++) {
		var p = list.Items[i];
		if (p.Product.toUpperCase() == newItem.Product.toUpperCase()) {
			if (!isNaN(amount)) {
				var oldAmount = parseInt(p.Amount, 10);
				if (isNaN(oldAmount))
					p.Amount = 0;
				
				p.Amount = oldAmount + amount;
				console.log(amount + " added to " + p.Product);
			}
			return;
		}
	}

	newItem.ID = uuid.v4();
	list.Items.push(newItem);
	list.Items.sort(function (a, b) {
		var p1 = a.Product.toUpperCase();
		var p2 = b.Product.toUpperCase();
		if (p1 > p2) return 1;
		if (p2 > p1) return -1;
		return 0;
	});
	console.log(newItem.Product + " added to list");
};

function deleteByIndex(index) {
	if (index < list.Items.length) {
		var item = list.Items[index];
		list.Items.splice(index, 1);
       	    	console.log(item.Product + " at index " + index + " removed from list");
	} else {
       	    	console.error("No such index: " + index);
	}
};

function deleteByID(id) {
	console.log("Trying to delete product with id '"+id+"'");
	for (var i = 0; i < list.Items.length; i++) {
       		var p = list.Items[i];

		if (id == p.ID) {
       		     	list.Items.splice(i, 1);
       	     		console.log("Product " + id + " removed from list");
       		     	return;
    		}
	}
       	console.warn("Product " + id + " not found in list");
}

function deleteByName(product) {
	var prod = product.trim().toUpperCase();
	console.log("Trying to delete product '"+prod+"'");
	for (var i = 0; i < list.Items.length; i++) {
       		var p = list.Items[i];
		var existing = p.Product.trim().toUpperCase();
		console.log("compare to '"+existing+"'");
		if (existing == prod) {
       		     	list.Items.splice(i, 1);
       		     	console.log(product + " removed from list");
       		     	return;
    		}
    	}
	console.log(product + " not in list!");
};

function sendFile(fileName, root, req, res){
	var options = {
		root: __dirname + root,
		dotfiles: 'deny',
		headers: {
			'x-timestamp': Date.now(),
			'x-sent': true
		}
	};
	res.sendFile(fileName, options, function (err) {
		if (err) {
			console.log(err);
			res.status(err.status).end();
		} else {
			console.log('Sent:' + root + fileName + " to " +req.ip);
		}
	});
};

app.get('/', function (req, res) {
    res.end(JSON.stringify(list));
});

app.get('/edit', function(req, res){
	var options = {
		root: __dirname,
		dotfiles: 'deny',
		headers: {
			'x-timestamp': Date.now(),
			'x-sent': true
		}
	};
	var fileName = "EditList.html";
	
	res.sendFile(fileName, options, function (err) {
		if (err) {
		  console.log(err);
		  res.status(err.status).end();
		}
		else {
		  console.log('Sent:' + fileName + " to " +req.ip);
		}
	});
});

app.get('/resources/:file', function(req, res){
	sendFile(req.params.file, '/resources/', req, res);
});

app.get('/list', function (req, res) {
	var html = "<html><head><title>" + list.Name + "</title></head><body>";
	html += "<table>";
	html += "<tr><th>Produkt</th><th>Anzahl</th></tr>";
	for (var i = 0; i < list.Items.length; i++)
	{
		var a = "&nbsp;";
		var amount = parseInt(list.Items[i].Amount, 10);
		if (!isNaN(amount))
			a = amount + " " + list.Items[i].Unit;

		html += "<tr><td>" + list.Items[i].Product + "</td><td>" + a + "</td></tr>";
	}
	html += "</table>";
	html += "</body>";

	res.end(html);
});


app.post('/', function (req, res) {
	console.log("ADD PRODUCT: " + JSON.stringify(req.body));
	product = req.body;
	addToList(product);
	fs.writeFileSync(listPath, JSON.stringify(list));
	res.end(JSON.stringify(list));
});

app.delete('/index/:index', function (req, res) {
	console.log("DELETE /index/...");
	var index = req.params.index;
	console.log("DELETE product by index: " + index);
	deleteByIndex(index);
	fs.writeFileSync(listPath, JSON.stringify(list));
	res.end(JSON.stringify(list));
});

app.delete('/product/:id', function (req, res) {
	console.log("DELETE /product/...");
	var id = req.params.id;
	console.log("DELETE product by id: " + id);
	deleteByID(id);
	fs.writeFileSync(listPath, JSON.stringify(list));
	res.end(JSON.stringify(list));
});

app.delete('/product/name/:product', function (req, res) {
	console.log("DELETE /product/name/...");
	var product = decodeURIComponent(req.params.product);
	console.log("DELETE product by name: " + product);
	deleteByName(product);
	fs.writeFileSync(listPath, JSON.stringify(list));
	res.end(JSON.stringify(list));
});

var server = app.listen(8081, function () {
	var host = server.address().address
	var port = server.address().port

	console.log("Einkaufslisten-Server auf http://%s:%s", host, port)

	console.log(list);
});
