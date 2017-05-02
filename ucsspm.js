// Adopted from
// https://apollo.open-resource.org/lab:ucsspm

function ucsspm(defValues, lat, lon, date) {
    // Description of defValues in test case below
    // lat - latitude on Earth, deg
    // lon - longitude on Earth, deg
    // date - date and time of interest
    var res = {};
    dst_off = 0;
    tz_off_deg = 0 + lon;
    
    if(isLeap = new Date(date.getYear(), 2, 0).getDate() == 29)
    {
        // Leap year (366 days)
        lMonth      = [0,31,60,91,121,152,182,213,244,274,305,335,366]
    }
    else{
        // Normal year (365 days)
        lMonth      = [0,31,59,90,120,151,181,212,243,273,304,334,365]
    }
    
    res['DoY']      = lMonth[date.getMonth() - 1] + date.getDate();
    res['ToD']      = date.getHours() + (date.getMinutes()/60.0) + (date.getSeconds()/3600.0);
    //console.log(res['DoY']);
    //console.log(res['ToD']);

    // Solve equation of time ###################################################
    // (More info on http://www.srrb.noaa.gov/highlights/sunrise/azel.html)

    res['eqt']      = (((5.0323-(430.847*Math.cos((((2*Math.PI)*res['DoY'])/366)+4.8718)))
                    + (12.5024*(Math.cos(2*((((2*Math.PI)*res['DoY'])/366)+4.8718))))
                    + (18.25*(Math.cos(3*((((2*Math.PI)*res['DoY'])/366)+4.8718))))
                    - (100.976*(Math.sin((((2*Math.PI)*res['DoY'])/366)+4.8718))))
                    + (595.275*(Math.sin(2*((((2*Math.PI)*res['DoY'])/366)+4.8718))))
                    + (3.6858*(Math.sin(3*((((2*Math.PI)*res['DoY'])/366)+4.871))))
                    - (12.47*(Math.sin(4*((((2*Math.PI)*res['DoY'])/366)+4.8718)))))
                    / 60 ;
                    
    //console.log(res['eqt']);
                    
    // Compute inverse relative distance factor (Distance between Earth and Sun)

    res['sol_r']    = 1.0 / Math.pow((1.0 - 9.464e-4 * Math.sin(res['DoY'])   
                    - 0.01671  * Math.cos(res['DoY'])
                    - 1.489e-4 * Math.cos(2.0 * res['DoY'])
                    - 2.917e-5 * Math.sin(3.0 * res['DoY'])
                    - 3.438e-4 * Math.cos(4.0 * res['DoY'])), 2);
                    
    //console.log(res['sol_r']);
                    
    //Compute solar declination ################################################
    res['sol_d']    = (Math.asin(0.39785 * (Math.sin(((278.97 
                    + (0.9856 * res['DoY'])) + (1.9165  
                    * (Math.sin((356.6 + (0.9856 * res['DoY'])) 
                    * (Math.PI / 180))))) * (Math.PI / 180)))) * 180) / Math.PI ;
                    
    // console.log(res['sol_d']);
                    
    // Compute time of solar noon ###########################################
    res['sol_n']    = ((12 + dst_off) - (res['eqt'] / 60)) 
                    - ((tz_off_deg - lon) / 15);
                    
    //console.log(res['sol_n']);
                    
    // Compute solar zenith angle in DEG ####################################

    res['sol_z']    = Math.acos(((Math.sin(lat * (Math.PI / 180)))   
                    * (Math.sin(res['sol_d'] * (Math.PI / 180))))      
                    + (((Math.cos(lat * ((Math.PI / 180))))     
                    * (Math.cos(res['sol_d'] * (Math.PI / 180))))
                    * (Math.cos((res['ToD'] - res['sol_n']) 
                    * (Math.PI /12))))) * (180/Math.PI) ;
                    
    //console.log(res['sol_z']);
    
    // # A solar zenith angle value of > 90 usually indicates that the sun has set
    // # (from observer's perspective at the given location for this computation).
    // # However, in extreme latitudes, valid values over 90 may occur. If you live
    // # in such a place and happen to stumble upon this code, please report back
    // # when you use it so we can find a better fix for this than the follwing hack.
    // # Unfortunately, if we don't fail safely here, we are confronted with some
    // # nasty division by zero business further on, so...
    
    // Let's assume that solar radiation and power output equals 0 or esimate 
    // effects of diffusive solar radiation using other method
    if (res['sol_z'] > 90 ){
        // HACK
        // # Estimate Pressure from given altitude
        at_p    = Math.pow(((288 - (0.0065 * (defValues["alt"] - 0))) / 288),
                          (9.80665 / (0.0065 * 287))) * 101.325 ;
        //console.log(at_p);
                                        
        // Estimate air vapor pressure in kPa #######################################

        res['at_vp']    = (0.61121 * Math.exp((17.502 * defValues["at_t"])
                        / (240.97 + defValues["at_t"]))) 
                        * (defValues["at_h"] / 100) ;
                    
        //console.log(res['at_vp']);
                    
                    
        //# Extraterrestrial radiation in W/m2 #######################################

        res['ETR'] = 0.0 ;
                    
        //console.log(res['ETR']);

        //# Precipitable water in the atmosphere in mm ###############################

        res['at_pw']    = ((0.14 * res['at_vp']) * at_p) + 2.1 ;
        //console.log(res['at_pw']);
    
        // Clearness index for direct beam radiation [unitless] #####################

        res['CIDBR']    = 0.98 * (Math.exp(((-0.00146 * at_p) 
                        / (defValues["at_tc"] * (Math.sin((90 - res['sol_z'])   
                        * (Math.PI / 180))))) - (0.075 * (Math.pow((res['at_pw'] 
                        / (Math.sin((90 - res['sol_z']) * (Math.PI / 180)))),0.4))))) ;                
        //console.log(res['CIDBR']); 
        
        // Transmissivity index for diffuse radiation [unitless] ####################
        if (res['CIDBR'] > 0.15) {
            res['TIDR'] = 0.35 - (0.36 * res['CIDBR'])
        }
        else{
        res['TIDR'] = 0.18 + (0.82 * res['CIDBR'])
        }
        //console.log(res['TIDR']);
    
        // Model Estimated Shortwave Radiation (W/m2) ###############################

        res['RSO'] = 0.0 ;
        //console.log(res['RSO']);

        //# Estimate Theoretical Max. Power Output (Panel at nominal Efficiency) #####

        res['pv_max'] = 0.0 ;
        // console.log(res['pv_max']);
        
        // Estimate conversion loss due to module temperature #######################
        res['pv_l'] = (defValues["pv_t"]-25 ) * defValues["pv_tc"];
        res['pv_lp'] = (res['pv_max'] / 100) * res['pv_l'] ;

        //console.log(res['pv_lp']);
        //console.log(res['pv_l']);
        
        // Estimate conversion loss due to module age
        res['pv_la'] = 0.0 ;
    
        //console.log(res['pv_la']);

        // Estimate final System Power output
        res['pv_out']   = 0.0;
        //console.log(res['pv_out']);
    }
    else {
    
        // Estimate Pressure from given altitude
        at_p    = Math.pow(((288 - (0.0065 * (defValues["alt"] - 0))) / 288),
                          (9.80665 / (0.0065 * 287))) * 101.325 ;
        //console.log(at_p);
                                        
        // Estimate air vapor pressure in kPa #######################################
        res['at_vp']    = (0.61121 * Math.exp((17.502 * defValues["at_t"])
                        / (240.97 + defValues["at_t"]))) 
                        * (defValues["at_h"] / 100) ;
                    
        //console.log(res['at_vp']);
                     
        // Extraterrestrial radiation in W/m2 #######################################

        res['ETR']      = (defValues["sc"] * res['sol_r'])
                        * (Math.cos(res['sol_z'] * (Math.PI / 180))) ;
                    
        //console.log(res['ETR']);

        // Precipitable water in the atmosphere in mm ###############################
        res['at_pw']    = ((0.14 * res['at_vp']) * at_p) + 2.1 ;
        //console.log(res['at_pw']);
    
        // # Clearness index for direct beam radiation [unitless] #####################

        res['CIDBR']    = 0.98 * (Math.exp(((-0.00146 * at_p) 
                        / (defValues["at_tc"] * (Math.sin((90 - res['sol_z'])   
                        * (Math.PI / 180))))) - (0.075 * (Math.pow((res['at_pw'] 
                        / (Math.sin((90 - res['sol_z']) * (Math.PI / 180)))),0.4))))) ;                
        //console.log(res['CIDBR']);                
        //# Transmissivity index for diffuse radiation [unitless] ####################

        if (res['CIDBR'] > 0.15) {
            res['TIDR'] = 0.35 - (0.36 * res['CIDBR'])
        }
        else{
        res['TIDR'] = 0.18 + (0.82 * res['CIDBR'])
        }
        //console.log(res['TIDR']);
    
        //# Model Estimated Shortwave Radiation (W/m2) ###############################

        res['RSO'] = (res['CIDBR'] + res['TIDR']) * res['ETR'] ;
        //console.log(res['RSO']);

        //# Estimate Theoretical Max. Power Output (Panel at nominal Efficiency) #####

        res['pv_max'] = (res['RSO'] * defValues["pv_a"]) / 100 * defValues["pv_a"] ;
        // console.log(res['pv_max']);
        // Estimate conversion loss due to module temperature #######################

        res['pv_l']     = (defValues["pv_t"]-25 ) * defValues["pv_tc"];
        res['pv_lp']    = (res['pv_max'] / 100) * res['pv_l'] ;

        //console.log(res['pv_lp']);
        //console.log(res['pv_l']);
        //# Estimate conversion loss due to module age

        res['pv_la']    = res['pv_max'] - (res['pv_max'] * defValues["pv_ac"]) ;
    
        //console.log(res['pv_la']);

        //# Estimate final System Power output
        res['pv_out']   = res['pv_max'] - res['pv_la'] - res['pv_lp'];
        //console.log(res['pv_out']);
    }
    
    return res ;
}

/* Date time function for change data*/
/**
 * http://stackoverflow.com/questions/1197928/how-to-add-30-minutes-to-a-javascript-date-object
 * Adds time to a date. Modelled after MySQL DATE_ADD function.
 * Example: dateAdd(new Date(), 'minute', 30)  //returns 30 minutes from now.
 * 
 * @param date  Date to start with
 * @param interval  One of: year, quarter, month, week, day, hour, minute, second
 * @param units  Number of units of the given interval to add.
 */
function dateAdd(date, interval, units) {
  var ret = new Date(date); //don't change original date
  var checkRollover = function() { if(ret.getDate() != date.getDate()) ret.setDate(0);};
  switch(interval.toLowerCase()) {
    case 'year'   :  ret.setFullYear(ret.getFullYear() + units); checkRollover();  break;
    case 'quarter':  ret.setMonth(ret.getMonth() + 3*units); checkRollover();  break;
    case 'month'  :  ret.setMonth(ret.getMonth() + units); checkRollover();  break;
    case 'week'   :  ret.setDate(ret.getDate() + 7*units);  break;
    case 'day'    :  ret.setDate(ret.getDate() + units);  break;
    case 'hour'   :  ret.setTime(ret.getTime() + units*3600000);  break;
    case 'minute' :  ret.setTime(ret.getTime() + units*60000);  break;
    case 'second' :  ret.setTime(ret.getTime() + units*1000);  break;
    default       :  ret = undefined;  break;
  }
  return ret;
}

//########################################################
//########################################################
// Test case power output through the day
function ucsspm_thisday() {

    // Array of 360x360 - texture
    var defValues = {};

    //# Decreased Solar Constant - See docs/solar-constant.pdf for update info. ##
    //# Default value of 1361.0 should IMHO serve as a good average point
    //# between the min/max values over the 11-year sun cycle.
    //"Solar Constant (@1AU) in kW/m? [Default: 1361.0]"
    
    defValues["sc"] = 1361.0;                                                

    //# Optional, only needed if barometric pressure not available to compute it.
    //# If no value is supplied to either, an altitude of 0m (NN) will be default
    //# Obviously, this is only a fallback and using the actual barometric pressure
    //# should always be preferred to yield a less averagish result.
    
    //"Altitude in meters above NN [Default: 0]"
    defValues["alt"] = 0;
    
    //"ISO Date YYYY-MM-DD [Default: "  
    //"ISO Time HH:MM:SS [Default: "

    //# Environmental Conditions #################################################
    // "Atmospheric Temperature in °C [Default: 25.0]" 
    defValues["at_t"] = 25.0 ;

    //"Atmospheric Relative Humidity in Percent [Default: 50]"    
    defValues["at_h"] = 50.0 ;

    //# Can be optional by submitting altitude - but will be less precise then ###
    // "Atmospheric Air Pressure in hPa [Default: Computed]"

    // "Atmospheric Turbidity Coefficient [Default: 0.95]"
    defValues["at_tc"] = 0.95 ;

    // Photovoltaic Parameters ##################################################
    // "PV Panel Efficiency in Percent [Default: 16?]"
    defValues["pv_a"] = 20 ; 

    //"Effective PV Panel Surface in m? [Default: 1.67]"
    defValues["pv_a"] = 1.67 ;

    // "PV Panel Temperature in °C [Default: 25.0]"
    defValues["pv_t"] = 25.0 ;

    // "PV Panel negative Temp. Coefficient [Default: 0.35]"
    defValues["pv_tc"] = 0.35 ;

    // "PV Panel age related Coefficient [Default: 0.98]"
    defValues["pv_ac"] = 0.98 ;

    var date = new Date();

    // Power output at current time
    var x = ucsspm(defValues, 41, 28, date); 
    //console.log(x['pv_out']);

    // var hours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
    var todayHours = [];
    for(i=0; i<=23; i++ ) {
        today = new Date();
        today.setHours(i) ;
        todayHours[i] = today ;
        //console.log(todayHours[i].getHours());
    }

    //for(i=0; i<=23; i++ ) {
    //    console.log(todayHours[i].getHours());
    //}

    var todaysPV = [];
    for(i=0; i<=23; i++) {
        power = ucsspm(defValues, 41, 28, todayHours[i]);
        todaysPV[i] = power;
    }

    for(i=0; i<=23; i++ ) {
        console.log(todayHours[i].getHours() , todaysPV[i]['pv_out']);
    }
}

// Test case power output at that moment all over the world 

function allOverTheWorld() {
  // Array of 360x360 - texture
    var defValues = {};

    //# Decreased Solar Constant - See docs/solar-constant.pdf for update info. ##
    //# Default value of 1361.0 should IMHO serve as a good average point
    //# between the min/max values over the 11-year sun cycle.
    //"Solar Constant (@1AU) in kW/m? [Default: 1361.0]"
    
    defValues["sc"] = 1361.0;                                                

    //# Optional, only needed if barometric pressure not available to compute it.
    //# If no value is supplied to either, an altitude of 0m (NN) will be default
    //# Obviously, this is only a fallback and using the actual barometric pressure
    //# should always be preferred to yield a less averagish result.
    
    //"Altitude in meters above NN [Default: 0]"
    defValues["alt"] = 0;
    
    //"ISO Date YYYY-MM-DD [Default: "  
    //"ISO Time HH:MM:SS [Default: "

    //# Environmental Conditions #################################################
    // "Atmospheric Temperature in °C [Default: 25.0]" 
    defValues["at_t"] = 25.0 ;

    //"Atmospheric Relative Humidity in Percent [Default: 50]"    
    defValues["at_h"] = 50.0 ;

    //# Can be optional by submitting altitude - but will be less precise then ###
    // "Atmospheric Air Pressure in hPa [Default: Computed]"

    // "Atmospheric Turbidity Coefficient [Default: 0.95]"
    defValues["at_tc"] = 0.95 ;

    // Photovoltaic Parameters ##################################################
    // "PV Panel Efficiency in Percent [Default: 16?]"
    defValues["pv_a"] = 20 ; 

    //"Effective PV Panel Surface in m? [Default: 1.67]"
    defValues["pv_a"] = 1.67 ;

    // "PV Panel Temperature in °C [Default: 25.0]"
    defValues["pv_t"] = 25.0 ;

    // "PV Panel negative Temp. Coefficient [Default: 0.35]"
    defValues["pv_tc"] = 0.35 ;

    // "PV Panel age related Coefficient [Default: 0.98]"
    defValues["pv_ac"] = 0.98 ;

    var date = new Date(); // assume that it is time on Greenwich meridian
    
    // latitude from -90 to 90
    // longitude from -180 to 180
    lats = [];
    lons = [];
    times = [];
    // TODO: add altitude
    powers = [];
    
    for (lat=-90; lat<=90; lat++) {
        for(lon=-180; lon<=180; lon++) {
            lats.push(lat);
            lons.push(lon);
            
            // Calculate local time according the longitude
            newDate = dateAdd(date, 'minute', lon*4);
            times.push(newDate);
            
            power = ucsspm(defValues, lat, lon, newDate);
            powers.push(power['pv_out']);
        }
    }
    
    for (j=0; j<powers.length; j++){
        console.log(lats[j], lons[j], powers[j]);
    }
}

// ucsspm_thisday();
allOverTheWorld();

