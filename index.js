var Service, Characteristic;
var Firebase = require('firebase');

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    
    homebridge.registerAccessory("homebridge-fireswitch", "FireSwitch", fireSwitch);
};

class fireSwitch {
    constructor(log, config) {
        var self = this;
        this.log = log;
        this.name = config.name;
        this.server = config.server;
        this.path = config.path;
        this.on_value = config.on_value;
        this.off_value = config.off_value;
        this.auth_method = config.auth_method;
        this.auth_credentials = config.auth_credentials;
        this._state = false;
        
        this._db = new Firebase(this.server);
        this._db_path = this._db.child(path);
        this._db.onAuth(function(authData) {
            if (authData) {
                // parse the path
                self.path = self.path.replace("{uid}", self._db.getAuth().uid);
            } else {
                // try to authorize
                self._authorize();
            }
        });
        
    }
    
    _authorize() {
        switch (this.auth_method) {
            case 'password':
                this._db.authWithPassword(this.auth_credentials);
                break;
            case 'customtoken':
                this._db.authWithCustomToken(this.auth_credentials);
                break;
            case 'anonymously':
                this._db.authAnonymously();
                break;
        }
    }
    
    getState(callback) {
        var self = this;
        this._db_path.on('value', function(snapshot) {
            var val = snapshot.val();
            if ((self.on_value) && (self.on_value == val)) {
                self._state = true;
                callback(null, self._state);
                return;
            }
            
            if ((self.off_value) && (self.off_value == val)) {
                self._state = false;
                callback(null, self._state);
                return;
            }
            
            if ((self.on_value == undefined) || (self.on_value == null)) {
                self.state = (val == undefined) || (val == null);
                callback(null, self._state);
                return;
            }
            
            if ((self.off_value == undefined) || (self.off_value == null)) {
                self.state = (val != undefined) && (val != null);
                callback(null, self._state);
                return;
            }
        });
        callback(null, this._state);
    }
    
    setState(val, callback) {
        var self = this;
        this._state = val;
        if ((val == true) && (this.on_value)) {
            this._db_path.set(this.on_value).then(function() {
                callback(null, self._state);
            });
        } else if ((val == false) && (this.off_value)) {
            this._db_path.set(this.off_value).then(function() {
                callback(null, self._state);
            });
        }
    }
    
    identify(callback) {
        this.log("Identify requested");
        callback();
    }
    
    getServices() {
        var switchService = new Service.Switch(this.name);
        
        switchService
            .getCharacteristic(Characteristic.Off)
            .on('set', this.setState.bind(this));
            
        return [switchService];
    }
}
