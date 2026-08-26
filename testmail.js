const mailSender = require('nodemailer');
const authentication_ = mailSender.createTransport({
    service:'gmail',
    auth:{
        user:'poddarbp879@gmail.com',
        pass:'misg knbj tulx namd'
    }
})
const mailOptions={
    from:'poddarbp879@gmail.com',
    to:'baishik145@gmail.com',
    subject:'Test mail from N-App',
    html:('Dear Sir/Madam,\n\n This is an automated email.')
}

authentication_.sendMail(mailOptions, (err,info)=>{
    if(err){
        console.log(err)
    }else{
        console.log(info)
    }
})