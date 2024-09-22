const express = require('express');
const Sequelize = require('sequelize');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '')));

const sequelizePassengers = new Sequelize('sqlite:./data/database.sqlite');
const sequelizeApp = new Sequelize('sqlite:./data/app.sqlite');

const Passenger = sequelizePassengers.define('passenger', {
    idCartao: { type: Sequelize.STRING, unique: true },
    nome: Sequelize.STRING,
    dataNascimento: Sequelize.DATEONLY,
    escola: Sequelize.STRING,
    numeroOnibus: Sequelize.INTEGER,
    foto: Sequelize.STRING
});

const BusPassengers = sequelizeApp.define('busPassenger', {
    busNumber: Sequelize.INTEGER,
    idCartao: Sequelize.STRING,
    nome: Sequelize.STRING
});

sequelizePassengers.sync();
sequelizeApp.sync();

// Endpoint para buscar todos os passageiros
app.get('/api/passengers', async (req, res) => {
    try {
        const passengers = await Passenger.findAll();
        res.json(passengers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para buscar passageiros de um ônibus específico
app.get('/api/bus/:busNumber', async (req, res) => {
    try {
        const { busNumber } = req.params;
        const busPassengers = await BusPassengers.findAll({
            where: { busNumber }
        });
        res.json(busPassengers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para salvar passageiros de um ônibus
app.post('/api/save', async (req, res) => {
    try {
        const { busNumber, passengers } = req.body;
        await BusPassengers.destroy({ where: { busNumber } });
        for (let passenger of passengers) {
            await BusPassengers.create({
                busNumber,
                idCartao: passenger.idCartao,
                nome: passenger.nome
            });
        }
        res.status(200).json({ message: 'Passageiros salvos com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3030, () => {
    console.log('API server is running on port 3030');
});
