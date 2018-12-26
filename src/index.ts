import { GlobalEnvironment } from './GlobalEnvironment'
import { MongooseAdapter } from './MongooseAdapter'
import { Twitch } from './Twitch'

// Define our dependencies
const express = require('express')
const session = require('express-session')
const passport = require('passport')
const OAuth2Strategy = require('passport-oauth').OAuth2Strategy
const request = require('request')
const handlebars = require('handlebars')
const program = require('commander')

// Options management with commander
program
  .version('0.0.1')
  .option('-p, --prod', 'Activate production mode')
  .option('-m, --mongo [url]', 'Specify the mongodb uri', 'localhost')
  .parse(process.argv)

console.log('---')
console.log('Back properties :\n')

// Twitch auth constants
let TWITCH_CLIENT_ID = 's64mw7a2valx6j8va02pqnm5vn1100'
let TWITCH_SECRET = GlobalEnvironment.devTwitchSecret
let SESSION_SECRET = GlobalEnvironment.devSessionSecret
let CALLBACK_URL = 'http://localhost:3000/auth/twitch/callback'
let REDIRECT_URL = 'http://localhost:4200/'

if (program.prod) {
  console.log('Mode : PRODUCTION')
  TWITCH_CLIENT_ID = 'mrwdbmh6pvc2791sfg3uib70o59e3z'
  TWITCH_SECRET = GlobalEnvironment.prodTwitchSecret
  SESSION_SECRET = GlobalEnvironment.prodSessionSecret
  CALLBACK_URL = 'http://showkapik.ddns.net:3000/auth/twitch/callback'
  REDIRECT_URL = 'http://showkapik.ddns.net'
} else {
  console.log('Mode : DEVELOPMENT')
}

let twitch = new Twitch(TWITCH_CLIENT_ID, TWITCH_SECRET)

// Initialize Express and middlewares
const app = express()

app.use(session({ secret: SESSION_SECRET, resave: false, saveUninitialized: false }))
app.use(express.static('public'))
app.use(express.json())
app.use(passport.initialize())
app.use(passport.session())

// Override passport profile function to get user profile from Twitch API
OAuth2Strategy.prototype.userProfile = (accessToken, done) => {
  const options = {
    url: 'https://api.twitch.tv/helix/users',
    method: 'GET',
    headers: {
      // 'Client-ID': TWITCH_CLIENT_ID,
      // 'Accept': 'application/vnd.twitchtv.v5+json',
      Authorization: 'Bearer ' + accessToken,
    },
  }

  request(options, (error, response, body) => {
    if (response && response.statusCode === 200) {
      done(null, JSON.parse(body))
    } else {
      done(JSON.parse(body))
    }
  })
}

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((user, done) => {
  done(null, user)
})

passport.use(
  'twitch',
  new OAuth2Strategy(
    {
      authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
      tokenURL: 'https://id.twitch.tv/oauth2/token',
      clientID: TWITCH_CLIENT_ID,
      clientSecret: TWITCH_SECRET,
      callbackURL: CALLBACK_URL,
      state: true,
    },
    (accessToken, refreshToken, profile, done) => {
      profile.accessToken = accessToken
      profile.refreshToken = refreshToken

      // Securely store user profile in your DB
      // User.findOrCreate(..., function(err, user) {
      //   done(err, user);
      // });

      done(null, profile)
    }
  )
)

// ----------------------------------------------------------------------------------------------------------
// MONGO INIT

const mongoose = new MongooseAdapter()
let connected = false
console.log('Mongo : ', program.mongo)
mongoose
  .connect(
    program.mongo,
    'Showkapik'
  )
  .then((v) => {
    console.log('Mongo Connection Successful')
    connected = true
  })
  .catch((err) => {
    console.log('Mongo Connection error : ', err)
  })

console.log('\n---')

// ----------------------------------------------------------------------------------------------------------

app.all('*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, access-control-allow-origin'
  )
  next()
})

// Set route to start OAuth link, this is where you define scopes to request
app.get('/auth/twitch', passport.authenticate('twitch', { scope: 'user_read' }), (req, res) => {
  res.send(req.user)
})

// Set route for OAuth redirect
app.get(
  '/auth/twitch/callback',
  passport.authenticate('twitch', {
    successRedirect: '/auth/twitch/validation',
    failureRedirect: '/auth/twitch/validation',
  })
)

// If user has an authenticated session, display it, otherwise display link to authenticate
app.get('/auth/twitch/validation', (req, res) => {
  if (req.session && req.session.passport && req.session.passport.user) {
    const passU = req.session.passport.user
    const u = {
      accessToken: passU.accessToken,
      refreshToken: passU.refreshToken,
      displayName: passU.data[0].display_name,
      bio: passU.data[0].description,
      logo: passU.data[0].profile_image_url,
    }
    twitch = new Twitch(TWITCH_CLIENT_ID, TWITCH_SECRET, u.accessToken, u.refreshToken)
    res.cookie('user', JSON.stringify(u))
    res.redirect(CALLBACK_URL)
  } else {
    res.redirect(CALLBACK_URL)
  }
})

// ----------------------------------------------------------------------------------------------------------

app.get('/streamers', (req, res) => {
  let liste = []
  mongoose
    .getStreamersId()
    .then((list) => {
      liste = list
      const ids = []
      list.forEach((e) => {
        ids.push(e.id)
      })
      return twitch.getStreamers(ids)
    })
    .then((users) => {
      const json = []
      users.forEach((u, index) => {
        const streamer = liste[index]
        const user = {
          id: u.id,
          name: u.name,
          display_name: u.displayName,
          description: u.description,
          picture_url: u.profilePictureUrl,
          broadcaster_type: u.broadcasterType,
          cache_key: u.cacheKey,
          offline_url: u.offlinePlaceholderUrl,
          views: u.views,
          youtube: streamer.youtube,
          twitter: streamer.twitter,
          test: streamer.id,
        }
        json.push(user)
      })
      res.json(json)
    })
})

app.post('/streamer', (req, res) => {
  twitch
    .getStreamer(req.body.id)
    .then((user) => {
      if (user) {
        mongoose.createStreamer(req.body.id)
        res.status(200)
      } else {
        res.status(404)
      }
      res.end()
    })
    .catch((err) => {
      res.status(400).end()
    })
})

app.put('/streamer/:id', (req, res) => {
  mongoose
    .updateStreamer(req.params.id, req.body)
    .then((v) => {
      res.status(200).end()
    })
    .catch((err) => {
      res.status(400).end()
    })
})

app.delete('/streamer/:id', (req, res) => {
  mongoose
    .deleteStreamer(req.params.id)
    .then((v) => {
      res.status(200).end()
    })
    .catch((err) => {
      res.status(400).end()
    })
})

app.get('/streamers/:name', (req, res) => {
  twitch.getStreamer(req.params.name).then((u) => {
    if (u) {
      const user = {
        id: u.id,
        name: u.name,
        display_name: u.displayName,
        description: u.description,
        picture_url: u.profilePictureUrl,
        broadcaster_type: u.broadcasterType,
        cache_key: u.cacheKey,
        offline_url: u.offlinePlaceholderUrl,
        views: u.views,
      }
      res.json(user)
    } else {
      res.status(404).end()
    }
  })
})

app.get('/stream/:name', (req, res) => {
  twitch.getStream(req.params.name).then((v) => {
    req.json(v)
  })
})

app.get('/online/:name', (req, res) => {
  twitch.getStream(req.params.name).then((v) => {
    if (v) {
      res.json(true)
    } else {
      res.json(false)
    }
  })
})
// ----------------------------------------------------------------------------------------------------------

app.listen(3000, () => {
  console.log('Twitch auth sample listening on port 3000!')
})
