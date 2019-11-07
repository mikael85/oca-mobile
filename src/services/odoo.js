import Odoo from 'react-native-odoo-promise-based';
import Axios from 'axios';
const url_api = require('url');

//   // if (userToken !== undefined) {
//   //   const odoo = new Odoo({
//   //     host: 'mobile.kmee.com.br',
//   //     port: '443',
//   //     database: 'mobile',
//   //     // username: this.state.user,
//   //     // password: this.state.password,
//   //     sid: userToken,
//   //     protocol: 'https',
//   //   });
//   //   await odoo
//   //     .connect()
//   //     .then(response => {
//   //       console.log(userToken);
//   //       console.log(response);
//   //       console.log(response.data);
//   //       AsyncStorage.setItem('userToken', response.data.session_id);
//   //     })
//   //     .catch(e => {
//   //       console.log(e);
//   //     });
//   // }
// }


// Instead redeclare this, just override fetch based methods
// Axios based Odoo

// Connect
Odoo.prototype.connect = async function () {
  var params = {
    db: this.database,
    login: this.username,
    password: this.password
  }

  var json = { params: params };
  var url = `${this.protocol}://${this.host}:${this.port}/web/session/authenticate`;

  var options = {
    url: url,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Content-Length': json.length
    },
    data: json
  }
  var self = this;
  return Axios(options)
    .then(function (response) {
      self.sid = response.headers.map['set-cookie'].split(';')[0].split('=')[1];
      self.cookie = response.headers.map['set-cookie'];

      console.log(response); // Delete-me after test

      if (response.data.error) {
        return { success: false, error: response.data.error };
      }
      else {
        self.uid = response.data.result.uid
        self.session_id = response.data.result.session_id
        self.context = response.data.result.user_context
        self.username = response.data.result.username
        return { success: true, data: response.data.result }
      }
    })
    .catch(function (error) {
      return { success: false, error: error }
    });
}

// Private functions
Odoo.prototype._request = function (path, params) {
  params = params || {}

  var options = {
    url: `${this.protocol}://${this.host}:${this.port}${path || '/'}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cookie': this.cookie
    },
    data: {
      jsonrpc: '2.0',
      id: new Date().getUTCMilliseconds(),
      method: 'call',
      params: params
    }
  }
  return Axios(options)
    .then(function (response) {
      if (response.data.error) {
        return { success: false, error: response.data.error }
      }
      else return { success: true, data: response.data.result }
    })
    .catch(function (error) {
      return { success: false, error: error }
    });
}

class OdooApi {
  constructor(url, login, password) {
    this.complete_url = url;
    this.login = login;
    this.password = password;
    this._parseURL();
    this.odoo = new Odoo({
      host: this.hostname,
      port: this.port,
      username: this.login,
      password: this.password,
      protocol: this.protocol,
    });
    this.database_list = [];
  }

  _parseURL() {
    if (!this.complete_url.includes('http')) {
      this.complete_url = "https://" + this.complete_url;
    }
    var url = url_api.parse(this.complete_url);
    this.hostname = url.hostname;

    this.protocol = url.protocol.replace(':', '');

    if (url.port === null) {
      if (this.protocol === 'https') {
        this.port = 443;
      } else if (this.protocol === 'http') {
        this.port = 80;
      }
    } else {
      this.port = url.port;
    }
    this.server_complete_url = url.href.replace(url.path, '/');
    this.server_backend_url = this.server_complete_url + 'web';
  }

  get database_list() {
    return this._getDatabases();
  }

  async _getDatabases() {
    var options = {
      url: this.complete_url + '/jsonrpc',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      data: {
        jsonrpc: '2.0',
        id: new Date().getUTCMilliseconds(),
        method: 'call',
        params: { service: 'db', method: 'list', args: [] }
      }
    };
    try{
      const {data } = await Axios(options);
      return data.result;
    }catch(error){
      console.log(error)
    }
  }

  async connect(database) {
    this.odoo.database = database;
    try {
      const response = await this.odoo.connect();
      if (response.success === true) {
        return response.data;
      }
    }
    catch (e) {
      return false;
    }
  }

  async get_user_image(user_id) {
    try {
      const response = await this.odoo
        .get('res.users', {
          ids: [user_id],
          fields: ['image_small'],
        });
      if (response.success === true) {
        return response.data[0].image_small;
      }
    }
    catch (e) {
      return false;
    }
  }
}

export default OdooApi;
