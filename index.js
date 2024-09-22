const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const Sequelize = require('sequelize');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');

const app = express();
const sequelizePassenger = new Sequelize('sqlite:data/database.sqlite');
const sequelizeAdmin = new Sequelize('sqlite:data/admin.sqlite');
const saltRounds = 10;


app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));
app.use(express.static('public'));

app.set('view engine', 'ejs');

// Define models
const Admin = sequelizeAdmin.define('admin', {
    username: { type: Sequelize.STRING, unique: true },
    password: Sequelize.STRING,
    keyNumber: Sequelize.STRING
});

const Passenger = sequelizePassenger.define('passenger', {
    idCartao: { type: Sequelize.STRING, unique: true },
    nome: Sequelize.STRING,
    dataNascimento: Sequelize.DATEONLY,
    escola: Sequelize.STRING,
    numeroOnibus: Sequelize.INTEGER,
    foto: Sequelize.STRING
});

// Setup file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Sync models and create default admin if not exists
sequelizeAdmin.sync().then(async () => {
    const admin = await Admin.findOne({ where: { username: 'admin' } });
    if (!admin) {
        const hashedPassword = await bcrypt.hash('password', saltRounds);
        await Admin.create({ username: 'admin', password: hashedPassword, keyNumber: '1234' });
    }
});
sequelizePassenger.sync();

// Middleware to check if user is logged in
function checkAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Routes
app.get('/login', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>Login</title>
            <style>
                body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #162e3b; }
                form { padding: 20px; border: 1px solid #ddd; background: #000; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); border-radius: 10px;}
                h2 {color: white;}
                input { display: block; margin-bottom: 10px; width: 100%; padding: 8px; box-sizing: border-box; }
                button { padding: 10px; background-color: #007BFF; width: 100%; color: white; border: none; cursor: pointer; color: white;}
                button:hover { background-color: #0056b3; }
            </style>
        </head>
        <body>
            <form action="/login" method="POST">
                <a href="https://www.inoutsolucoes.com.br/" target="_blank" ><img src="icons/inout.png"></a>
                <h2>Login</h2>
                <input type="text" name="username" placeholder="Username" required>
                <input type="password" name="password" placeholder="Password" required>
                <button type="submit">Login</button>
            </form>
        </body>
        </html>
    `);
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ where: { username } });

    if (admin && await bcrypt.compare(password, admin.password)) {
        req.session.user = admin;
        res.redirect('/dashboard');
    } else {
        res.send('Invalid username or password');
    }
});

app.get('/dashboard', checkAuth, async (req, res) => {
    const passengers = await Passenger.findAll();
    res.send(`
        <html>
        <head>
            <title>Dashboard</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #162e3b; margin: 0; padding: 0; }
                .container { width: 80%; margin: 20px auto; background: white; padding: 20px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); border-radius: 10px;}
                h1 { text-align: center; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 10px; border: 1px solid #ddd; }
                a { color: #007BFF; text-decoration: none; }
                a:hover { text-decoration: underline; }
                form.search { margin-bottom: 20px; text-align: center; }
                input.search { padding: 10px; width: 300px; }
                button.search { padding: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Dashboard</h1>
                <a href="/new">Add New Passenger</a>
                <br/>
                <a href="/settings">Admin Settings</a>
                <form class="search" action="/search" method="GET">
                    <input class="search" type="text" name="query" placeholder="Search by name or card ID" required>
                    <button class="search" type="submit">Search</button>
                </form>
                <table>
                    <tr>
                        <th>Card ID</th>
                        <th>Name</th>
                        <th>Birth Date</th>
                        <th>School</th>
                        <th>Bus Number</th>
                        <th>Photo</th>
                        <th>Edit</th>
                    </tr>
                    ${passengers.map(p => `
                        <tr>
                            <td>${p.idCartao}</td>
                            <td>${p.nome}</td>
                            <td>${p.dataNascimento}</td>
                            <td>${p.escola}</td>
                            <td>${p.numeroOnibus}</td>
                            <td><img src="/uploads/${p.foto}" width="50"></td>
                            <td><a href="/edit/${p.id}">Edit</a></td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        </body>
        </html>
    `);
});

app.get('/new', checkAuth, (req, res) => {
    res.send(`
        <html>
        <head>
            <title>New Passenger</title>
            <style>
                body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #162e3b; }
                form { padding: 20px; border: 1px solid #ddd; background: #fff; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); width: 300px; border-radius: 10px;}
                input, select { display: block; margin-bottom: 10px; width: 100%; padding: 8px; box-sizing: border-box; }
                button { padding: 10px; background-color: #007BFF; color: white; border: none; cursor: pointer; }
                button:hover { background-color: #0056b3; }
            </style>
        </head>
        <body>
            <form action="/new" method="POST" enctype="multipart/form-data">
                <h2>New Passenger</h2>
                <input type="text" name="idCartao" placeholder="Card ID" required>
                <input type="text" name="nome" placeholder="Name" required>
                <input type="date" name="dataNascimento" required>
                <input type="text" name="escola" placeholder="School" required>
                <input type="number" name="numeroOnibus" placeholder="Bus Number" required>
                <input type="file" name="foto" required>
                <button type="submit">Add Passenger</button>
            </form>
        </body>
        </html>
    `);
});

app.post('/new', checkAuth, upload.single('foto'), async (req, res) => {
    const { idCartao, nome, dataNascimento, escola, numeroOnibus } = req.body;
    const foto = req.file.filename;

    await Passenger.create({ idCartao, nome, dataNascimento, escola, numeroOnibus, foto });
    res.redirect('/dashboard');
});

app.get('/edit/:id', checkAuth, async (req, res) => {
    const passenger = await Passenger.findByPk(req.params.id);

    if (!passenger) {
        res.redirect('/dashboard');
    } else {
        let dataNascimento = '';

        if (passenger.dataNascimento) {
            try {
                const dateObj = new Date(passenger.dataNascimento);
                if (!isNaN(dateObj)) {
                    dataNascimento = dateObj.toISOString().split('T')[0];
                }
            } catch (error) {
                console.error('Error parsing date:', error);
            }
        }

        res.send(`
            <html>
            <head>
                <title>Edit Passenger</title>
                <style>
                    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #162e3b; }
                    form { padding: 20px; border: 1px solid #ddd; background: #fff; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); width: 300px; border-radius: 10px;}
                    input, select { display: block; margin-bottom: 10px; width: 100%; padding: 8px; box-sizing: border-box; }
                    button { padding: 10px; background-color: #007BFF; color: white; border: none; cursor: pointer; }
                    button:hover { background-color: #0056b3; }
                </style>
            </head>
            <body>
                <form action="/edit/${passenger.id}" method="POST" enctype="multipart/form-data">
                    <h2>Edit Passenger</h2>
                    <input type="text" name="idCartao" placeholder="Card ID" value="${passenger.idCartao}" required>
                    <input type="text" name="nome" placeholder="Name" value="${passenger.nome}" required>
                    <input type="date" name="dataNascimento" value="${dataNascimento}" required>
                    <input type="text" name="escola" placeholder="School" value="${passenger.escola}" required>
                    <input type="number" name="numeroOnibus" placeholder="Bus Number" value="${passenger.numeroOnibus}" required>
                    <input type="file" name="foto">
                    <button type="submit">Save Changes</button>
                    <br/>
                    <td><a href="/delete/${passenger.id}" style="color: red;">Delete</a></td>
                </form>
            </body>
            </html>
        `);
    }
});


app.post('/edit/:id', checkAuth, upload.single('foto'), async (req, res) => {
    const passenger = await Passenger.findByPk(req.params.id);

    if (passenger) {
        const { idCartao, nome, dataNascimento, escola, numeroOnibus } = req.body;
        let foto = passenger.foto;

        if (req.file) {
            foto = req.file.filename;
        }

        await passenger.update({ idCartao, nome, dataNascimento, escola, numeroOnibus, foto });
    }

    res.redirect('/dashboard');
});

app.get('/delete/:id', checkAuth, async (req, res) => {
    const passenger = await Passenger.findByPk(req.params.id);

    if (passenger) {
        const imagePath = path.join(__dirname, 'public', 'uploads', passenger.foto);

        // Delete image file
        fs.unlink(imagePath, async (err) => {
            if (err) {
                console.error(err);
            } else {
                // Delete passenger record
                await passenger.destroy();
            }
        });
    }

    res.redirect('/dashboard');
});

app.get('/settings', checkAuth, async (req, res) => {
    const admins = await Admin.findAll();
    res.send(`
        <html>
        <head>
            <title>Admin Settings</title>
            <style>
                body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #162e3b; }
                form { padding: 20px; border: 1px solid #ddd; background: white; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); width: 300px; border-radius: 10px;}
                input { display: block; margin-bottom: 10px; width: 100%; padding: 8px; box-sizing: border-box; background: white;}
                button { padding: 10px; background-color: #007BFF; color: white; border: none; cursor: pointer; }
                button:hover { background-color: #0056b3; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; background: white; }
                th, td { padding: 10px; border: 1px solid #ddd; }
                a { color: #007BFF; text-decoration: none; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <form action="/settings/add" method="POST">
                <h2>Add Admin</h2>
                <input type="text" name="username" placeholder="Username" required>
                <input type="password" name="password" placeholder="Password" required>
                <input type="text" name="keyNumber" placeholder="Key Number" required>
                <button type="submit">Add Admin</button>
            </form>
            <table>
                <tr>
                    <th>Username</th>
                    <th>Key Number</th>
                    <th>Delete</th>
                </tr>
                ${admins.map(a => `
                    <tr>
                        <td>${a.username}</td>
                        <td>${a.keyNumber}</td>
                        <td><a href="/settings/delete/${a.id}">Delete</a></td>
                    </tr>
                `).join('')}
            </table>
        </body>
        </html>
    `);
});

app.post('/settings/add', checkAuth, async (req, res) => {
    const { username, password, keyNumber } = req.body;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await Admin.create({ username, password: hashedPassword, keyNumber });
    res.redirect('/settings');
});

app.get('/settings/delete/:id', checkAuth, async (req, res) => {
    const admin = await Admin.findByPk(req.params.id);

    if (admin) {
        await admin.destroy();
    }

    res.redirect('/settings');
});

app.get('/search', checkAuth, async (req, res) => {
    const { query } = req.query;
    const passengers = await Passenger.findAll({
        where: {
            [Sequelize.Op.or]: [
                { nome: { [Sequelize.Op.like]: `%${query}%` } },
                { idCartao: { [Sequelize.Op.like]: `%${query}%` } }
            ]
        }
    });

    res.send(`
        <html>
        <head>
            <title>Search Results</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #162e3b; margin: 0; padding: 0; }
                .container { width: 80%; margin: 20px auto; background: white; padding: 20px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); border-radius: 10px;}
                h1 { text-align: center; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 10px; border: 1px solid #ddd; }
                a { color: #007BFF; text-decoration: none; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Search Results</h1>
                <a href="/dashboard">Back to Dashboard</a>
                <table>
                    <tr>
                        <th>Card ID</th>
                        <th>Name</th>
                        <th>Birth Date</th>
                        <th>School</th>
                        <th>Bus Number</th>
                        <th>Photo</th>
                        <th>Edit</th>
                    </tr>
                    ${passengers.map(p => `
                        <tr>
                            <td>${p.idCartao}</td>
                            <td>${p.nome}</td>
                            <td>${p.dataNascimento}</td>
                            <td>${p.escola}</td>
                            <td>${p.numeroOnibus}</td>
                            <td><img src="/uploads/${p.foto}" width="50"></td>
                            <td><a href="/edit/${p.id}">Edit</a></td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
