const express = require('express');
const Sequelize = require('sequelize');

const app = express();
const sequelizePassenger = new Sequelize('sqlite:./data/database.sqlite');

const Passenger = sequelizePassenger.define('passenger', {
    idCartao: { type: Sequelize.STRING, unique: true },
    nome: Sequelize.STRING,
    dataNascimento: Sequelize.DATEONLY,
    escola: Sequelize.STRING,
    numeroOnibus: Sequelize.INTEGER,
    foto: Sequelize.STRING
});

sequelizePassenger.sync();

app.get('/api/passengers', async (req, res) => {
    const passengers = await Passenger.findAll();
    res.json(passengers);
});

app.listen(4003, () => {
    console.log('API server is running on port 3001');
});
