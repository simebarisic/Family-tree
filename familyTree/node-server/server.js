const express = require('express')
const app = express()
const port = 2772
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const uuidv4 = require('uuid/v4');
const path = require('path');

const myHost = 'http://localhost:2772'

// DB povezivanje
db = require('./database/db');
db.connect();

syncdb = require('./database/syncdb')

//body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));


app.use(cors())

//postavljanje spremista slika
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads');
    },
    filename: (req, file, cb) => {
        const newFilename = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, newFilename);
    },
});

// spremiste
const upload = multer({ storage });

//static url za slike
app.use('/photos', express.static('./uploads'))

//pocetni url
app.get('/', (req, res) => res.send('Aplikacija Family Tree!'))


//sql upiti

// traženje osobe

function find_my_root(memId){
    var currentId = memId
    willContinue = true
    var result = []
    var query = '';

    while (willContinue){
        query = `SELECT * FROM family_members WHERE mem_id = '${currentId}'`
        result = syncdb.query(query)
        if (result[0].father_id != undefined)
            currentId = result[0].father_id
        else if (result[0].mother_id != undefined)
            currentId = result[0].mother_id
        else
            willContinue = false
        
    }
    console.log(currentId)
    return currentId
}

//stvaranje novog stabla nakon registracije  korisnika 

function make_family_list_from_root(rootId) {
    var query = ''
    var myFamily = []
    var tagList = []
    // trazimo korisnika po id-u i stavljamo ga u stablo s pripadajucim informacijama
    query = `SELECT * FROM family_members WHERE mem_id = '${rootId}'`
    result = syncdb.query(query)
    tagList.push('f'+rootId.toString())
    myFamily.push({ 
        id: rootId,
        tags: ['f'+rootId.toString()],
        pid: (result[0].father_id != null) ? result[0].father_id : result[0].mother_id,
        firstName: result[0].first_name,
        lastName: result[0].family_name,
        dateOfBirth: result[0].date_of_birth,
        gender: result[0].gender,
        profession: result[0].profession,
        aliveOrDead: result[0].alive_or_dead,
        img: myHost+'/photos/'+result[0].photo_filename
    })
 // provjera je li mu unesena zena ili muz
    if (result[0].husband_wife_id != null){
        query = `SELECT * FROM family_members WHERE mem_id = '${result[0].husband_wife_id}'`
        result = syncdb.query(query)
        myFamily.push({
            id: result[0].mem_id,
            tags: ['f'+rootId.toString(), 'noLineage'],
            pid: (result[0].father_id != null) ? result[0].father_id : result[0].mother_id,
            firstName: result[0].first_name,
            lastName: result[0].family_name,
            dateOfBirth: result[0].date_of_birth,
            gender: result[0].gender,
            profession: result[0].profession,
            aliveOrDead: result[0].alive_or_dead,
            img: myHost+'/photos/'+result[0].photo_filename
        })
    }

    query = `SELECT * FROM family_members WHERE father_id = '${rootId}' OR mother_id = '${rootId}'`

    result = syncdb.query(query)
    
    result.map(row => {
        console.log(row.mem_id, rootId)
        var res = make_family_list_from_root(row.mem_id);
        tagList = tagList.concat(res.tagList)
        myFamily = myFamily.concat(res.myFamily)
    })
    
    return {tagList, myFamily}


}




//api routes
    // provjera postoji li korisnik u tablici kod login-a
app.post('/api/check_user', (req, res) => {
    var userId_or_email = req.body.userId_or_email;
    var user_password = req.body.user_password;
    var checked = 'No';
    var data = {};
    db.query(`SELECT * FROM d_users WHERE (user_id = '${userId_or_email}' OR email_address = '${userId_or_email}') AND password = '${user_password}'`, (err, rows, fields) => {
        if (err) throw err;
        
        if (rows.length > 0){
            checked ='OK'
            data = {
                checked: checked,
                memId: rows[0].family_mem_id
            }
        } else {
            data = { checked: checked }
        }
        res.status(200).send({
            success: 'true',
            message: 'Uspjesna prijava',
            data: data
            
        })

    })
    
})

    //registracija korisnika
app.post('/api/reg_user', upload.single('photoFile'), (req, res) => {
    var firstName = req.body.firstName;
    var lastName = req.body.lastName;
    var userId = req.body.userId;
    var emailAddress = req.body.emailAddress;
    var password = req.body.password;
    var dateOfBirth = req.body.dateOfBirth;
    var gender = req.body.gender;
    var profession = req.body.profession;
    var fileName = req.file.filename;
    var member_id = 0;
    var query = 'SELECT MAX(mem_id) FROM family_members';
    db.query(query, (err, rows, fields) => {
        if (err) throw err
        member_id = rows[0]['MAX(mem_id)'] + 1
        query =`INSERT INTO d_users (user_id, password, email_address, family_mem_id) VALUES ('${userId}', '${password}', '${emailAddress}', '${member_id}'); INSERT INTO family_members (mem_id, first_name, family_name, date_of_birth, gender, profession, photo_filename) VALUES('${member_id}', '${firstName}', '${lastName}', '${dateOfBirth}', '${gender}', '${profession}', '${fileName}');`;
        db.query(query, (err, results) => {
            if(err) throw err;
            res.status(200).send({
                success: 'true',
                message: 'Uspjesna registracija'
            })
        });
    })
    
    
});

//dohvati stablo prema member_id nakon logina
app.get('/api/myFamily/:memId', (req, res) => {
    var memId = Number(req.params.memId) // dohvaca broj iz http get zahtjeva

    var rootId = find_my_root(memId)

    var result = make_family_list_from_root(rootId)

    res.status(200).send({
        success: 'true',
        message: 'Uspjesno',
        data: result
    })
});
//promjena određenih informacija
app.post('/api/update_member_info', (req, res) => {
    
    var query = `UPDATE family_members SET `
        + `first_name = '${req.body.firstName}', `
        + `family_name = '${req.body.lastName}', `
        + `date_of_birth = '${req.body.dateOfBirth}', `
        + `gender = '${req.body.gender}', `
        + `profession = '${req.body.profession}', `
        + `alive_or_dead = '${req.body.aliveOrDead}' `
        + `WHERE mem_id = '${req.body.id}'`
    syncdb.query(query)
    res.status(200).send({
        success: 'true',
        message: 'Uspjesno'
    })
    
})
    //brisanje osoba iz stabla
app.post('/api/remove_family_member', (req, res) => {
    var query = `DELETE FROM family_members WHERE mem_id = '${req.body.nodeId}'`
    db.query(query, (err, rows, fields) => {
        res.status(200).send({
            success: 'true',
            message: 'Osoba obrisana'
        })
    })
})
    //dodaj osobe u stablo
app.post('/api/add_family_member', upload.single('photoFile'), (req, res) => {
    var firstName = req.body.firstName;
    var lastName = req.body.lastName;
    var dateOfBirth = req.body.dateOfBirth;
    var gender = req.body.gender;
    var profession = req.body.profession;
    var aliveOrDead = req.body.aliveOrDead;
    var fileName = req.file.filename; //slika
    console.log(req.body)
    var selectedId = req.body.selectedId; 
    var kind = req.body.kind //uloga unutar stabla
    switch (kind) {
        case 'father':
            var query = 'SELECT MAX(mem_id) FROM family_members';
            var result = syncdb.query(query)
            var max_id = result[0]['MAX(mem_id)']
            
            max_id++
            query = `INSERT INTO family_members (mem_id, first_name, family_name, date_of_birth, gender, profession, alive_or_dead, photo_filename) VALUES('${max_id}', '${firstName}', '${lastName}', '${dateOfBirth}', '${gender}', '${profession}', '${aliveOrDead}', '${fileName}')`
            syncdb.query(query)
            
            query = `UPDATE family_members SET father_id = '${max_id}' WHERE mem_id = '${selectedId}'`
            syncdb.query(query)

            //provjera postoji li majka da povežemo oca i majku
            query = `SELECT * FROM family_members WHERE mem_id = '${selectedId}'`
            result = syncdb.query(query)
            if (result[0]['mother_id'] != null)
            {
                query = `UPDATE family_members SET husband_wife_id = '${result[0]['mother_id']}' WHERE mem_id = '${max_id}'` 
                syncdb.query(query)
                query = `UPDATE family_members SET husband_wife_id = '${max_id}' WHERE mem_id = '${result[0]['mother_id']}'` 
                syncdb.query(query) 
            }

            break;
        case 'mother':
            var query = 'SELECT MAX(mem_id) FROM family_members';
            var result = syncdb.query(query)
            var max_id = result[0]['MAX(mem_id)']
            
            max_id++
            query = `INSERT INTO family_members (mem_id, first_name, family_name, date_of_birth, gender, profession, alive_or_dead, photo_filename) VALUES('${max_id}', '${firstName}', '${lastName}', '${dateOfBirth}', '${gender}', '${profession}', '${aliveOrDead}', '${fileName}')`
            syncdb.query(query)
            
            query = `UPDATE family_members SET mother_id = '${max_id}' WHERE mem_id = '${selectedId}'`
            syncdb.query(query)
            
            //provjera postoji li otac da povezemo s majkom
            query = `SELECT * FROM family_members WHERE mem_id = '${selectedId}'`
            result = syncdb.query(query)
            if (result[0]['father_id'] != null)
            {
                query = `UPDATE family_members SET husband_wife_id = '${result[0]['father_id']}' WHERE mem_id = '${max_id}'` 
                syncdb.query(query) 
                query = `UPDATE family_members SET husband_wife_id = '${max_id}' WHERE mem_id = '${result[0]['father_id']}'` 
                syncdb.query(query) 
            }

            break;
        case 'sibling':
            var query = 'SELECT MAX(mem_id) FROM family_members';
            var result = syncdb.query(query)
            var max_id = result[0]['MAX(mem_id)']
            max_id++

            query = `SELECT * FROM family_members WHERE mem_id = '${selectedId}'`;
            var result = syncdb.query(query)
            
            query = `INSERT INTO family_members (mem_id, first_name, family_name, date_of_birth, gender, profession, alive_or_dead, photo_filename) VALUES('${max_id}', '${firstName}', '${lastName}', '${dateOfBirth}', '${gender}', '${profession}', '${aliveOrDead}', '${fileName}')`
            syncdb.query(query)

            //povezivanje djece s roditeljima
            if (result[0].father_id != null){
                query = `UPDATE family_members SET father_id = '${result[0].father_id}' WHERE mem_id = '${max_id}'`
                syncdb.query(query)
            }
            if (result[0].mother_id != null){
                query = `UPDATE family_members SET mother_id = '${result[0].mother_id}' WHERE mem_id = '${max_id}'`
                syncdb.query(query)
            }
            break;
        case 'child':
            var query = `SELECT * FROM family_members WHERE mem_id = '${selectedId}'`;
            var result = syncdb.query(query)
            
            //gender = 0 (M)
            if (result[0].gender == 0)
            {
                //ako je djetetu vec zena upisana pa povezujemo
                if (result[0].husband_wife_id != null)
                    query = `INSERT INTO family_members (first_name, family_name, date_of_birth, gender, profession, alive_or_dead, photo_filename, father_id, mother_id) VALUES('${firstName}', '${lastName}', '${dateOfBirth}', '${gender}', '${profession}', '${aliveOrDead}', '${fileName}', '${selectedId}', '${result[0].husband_wife_id}')`
                else
                    query = `INSERT INTO family_members (first_name, family_name, date_of_birth, gender, profession, alive_or_dead, photo_filename, father_id) VALUES('${firstName}', '${lastName}', '${dateOfBirth}', '${gender}', '${profession}', '${aliveOrDead}', '${fileName}', '${selectedId}')`
                syncdb.query(query)
            }
            else
            {
                if (result[0].husband_wife_id != null)
                    query = `INSERT INTO family_members (first_name, family_name, date_of_birth, gender, profession, alive_or_dead, photo_filename, mother_id, father_id) VALUES('${firstName}', '${lastName}', '${dateOfBirth}', '${gender}', '${profession}', '${aliveOrDead}', '${fileName}', '${selectedId}', '${result[0].husband_wife_id}')`
                else
                    query = `INSERT INTO family_members (first_name, family_name, date_of_birth, gender, profession, alive_or_dead, photo_filename, mother_id) VALUES('${firstName}', '${lastName}', '${dateOfBirth}', '${gender}', '${profession}', '${aliveOrDead}', '${fileName}', '${selectedId}')`
                syncdb.query(query)
            }
            
            break;
        case 'husbandOrWife':
            var query = 'SELECT MAX(mem_id) FROM family_members';
            var result = syncdb.query(query)
            var max_id = result[0]['MAX(mem_id)']

            query = `SELECT * FROM family_members WHERE mem_id = '${selectedId}'`
            var mine= syncdb.query(query)
            
            max_id++    
            query = `SELECT * FROM family_members WHERE mem_id = '${selectedId}'`;
            result = syncdb.query(query)
            
            query = `INSERT INTO family_members (mem_id, first_name, family_name, date_of_birth, gender, profession, alive_or_dead, photo_filename, husband_wife_id) VALUES('${max_id}','${firstName}', '${lastName}', '${dateOfBirth}', '${gender}', '${profession}', '${aliveOrDead}', '${fileName}', '${selectedId}')`
            syncdb.query(query)

            query = `UPDATE family_members SET husband_wife_id = '${max_id}' WHERE mem_id = '${selectedId}'`
            syncdb.query(query)

            query = `UPDATE family_members SET ${mine[0].gender ? 'father_id':'mother_id'} = '${max_id}' WHERE father_id = '${selectedId}' OR mother_id = '${selectedId}'`
            result = syncdb.query(query)
           

            break;
    }
    res.status(200).send({
        success: 'true',
        message: 'Usjesno dodana nova osoba'
    })
});


app.listen(port, () => console.log(`The familyTree server listening on port ${port}!`))