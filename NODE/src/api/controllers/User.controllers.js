/* Los controladores consumen modelos.
1º Nos traemos la parte de borrado de imagen.
2º Nos traemos el User y el randomCode */
//!-----------------Middleware-----------------------------------------------
const { deleteImgCloudinary } = require("../../middleware/files.middleware");

//! ---------------------------- modelos ----------------------------------
const User = require("../models/User.model");

//! ---------------------------- utils ----------------------------------
const randomCode = require("../../utils/randomCode");
const sendEmail = require("../../utils/sendEmail");
const { generateToken } = require("../../utils/token");
const randomPassword = require("../../utils/randomPassword");
const enumOk = require("../../utils/enumOk");
//! ------------------------------librerias--------------------------------
//Vamos a utilizar librerias: Validator, Nodemeailer par mandar correo electrónicos y bcrypt:

const nodemailer = require("nodemailer");
const validator = require("validator");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const {
  setTestEmailSend,
  getTestEmailSend,
} = require("../../state/state.data");
const setError = require("../../helpers/handle-error");
dotenv.config();

/**+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 */
//! -----------------------------------------------------------------------------
//? --------CREATE DE CRUD------------------REGISTER LARGO EN CODIGO ------------------------
//! -----------------------------------------------------------------------------
//------------------->CRUD es el acrónimo de "Crear, Leer, Actualizar y Borrar"
/* Se crea una funcion asíncrona. Esta estructura es siempre igual*/
const registerLargo = async (req, res, next) => {
  /*Esta estructura es siempre igual
  1º -captura la imagen que previamente hemos subido en el middleaware */

  let catchImg =
    req.file?.path; /* Vamos a capturar la mimg que subimos previamente .
   Si no está la img subida, continúa. el optional chaining es para que no rompa en caso de no haber path. 
   Cuando a un objeto le falta un valor, permite continuar */
  // el path es la url de cloudinary.
  //Capturo errores con async/wait
  try {
    /*Se mete un try catch por cada asincronía que tengamos de actualizacion.
     *Para seleccionar errores de forma separada.
     *
     *Asincronías de lectura - No necesitan que tengan un try catch por cada una de ellas.
     */

    //!Se sincronizan los index(están dentro del modelo de la bd) de los elementos "unique".
    //!Sincroniza los index de manera correcta al modelo */
    await User.syncIndexes(); //A la espera del back,
    let confirmationCode = randomCode(); //Utilizamos el randomCode
    const { email, name } = req.body; /* BODY-  Es el cuerpo
    de la request es lo que yo envío. lo que enviamos por la parte del body de la request
    Para sacar el email y el nombre (las claves) del objeto que es la request. */
    // vamos a buscar al usuario par ver si existe.
    const userExist = await User.findOne(
      //Encuentrame un User que coincida o bien en el email o el name
      { email: req.body.email },
      { name: req.body.name }
    );

    if (!userExist) {
      //! -----USER NO EXISTE--------LO REGISTRAMOS PORQUE NO HAY COINCIDENCIAS CON UN USER INTERNO
      const newUser = new User({ ...req.body, confirmationCode });
      //Ya tenemos el _id del user
      //Tiene que aparecer lo que requiere el modelo. Ej: En name se pone name.
      // Spread operator, los datos que necesito para crear el nuevo usuario.
      // EL USER HA METIDO IMAGEN ???
      if (req.file) {
        newUser.image = req.file.path; //path: url de Cloudinary, subido previamente a traves del middleware
      } else {
        newUser.image = "https://pic.onlinewebfonts.com/svg/img_181369.png";
      } //Si no tiene img, ponemos esta img por defecto

      //! SI HAY UNA NUEVA ASINCRONIA DE CREAR O ACTUALIZAR HAY QUE METER OTRO TRY CATCH
      try {
        const userSave =
          await newUser.save(); /* Cogemos lo que hemos creado,y lo sube y guarda. Le hago una nueva
        constante a ese guardado.*/
        //---> ENVIAR EL CÓDIGO CON NODEMAILER, SE ENVIA AL USER EL CONFIRMATION CODE.
        if (userSave) {
          // ---------------------------> ENVIAR EL CODIGO CON NODEMAILER --------------------
          const emailEnv = process.env.EMAIL;
          const password = process.env.PASSWORD;

          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: emailEnv,
              pass: password,
            },
          });

          const mailOptions = {
            from: emailEnv,
            to: email,
            subject: "Confirmation code",
            text: `tu codigo es ${confirmationCode}, gracias por confiar en nosotros ${name}`,
          };

          transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              console.log(error);
              return res.status(404).json({
                user: userSave,
                confirmationCode: "error, resend code",
              });
            }
            console.log("Email sent: " + info.response);
            return res.status(200).json({
              user: userSave,
              confirmationCode,
            });
          });
        }
      } catch (error) {
        return res.status(404).json(error.message);
      }
    } else {
      ///! -------> cuando ya existe un usuario con ese email y ese name
      if (req.file) deleteImgCloudinary(catchImg);
      // como ha habido un error la imagen previamente subida se borra de cloudinary
      return res.status(409).json("this user already exist");
    }
  } catch (error) {
    // SIEMPRE QUE HAY UN ERROR GENERAL TENEMOS QUE BORRAR LA IMAGEN QUE HA SUBIDO EL MIDDLEWARE
    if (req.file) deleteImgCloudinary(catchImg);
    return next(error);
  }
};

//! -----------------------------------------------------------------------------
//? ----------------------------REGISTER CORTO EN CODIGO ------------------------
//! -----------------------------------------------------------------------------

/*Se crea una función asíncrona llamada "registerWithRedirect" que toma 3
param. 
req = solicitud. res = respuesta. next = próxima función de middleware

Se declara variable "catchImg" y se le asigna la ruta del archivo si
existe en el objeto req. Con operador ? se evita que genere error.*/

const register = async (req, res, next) => {
  let catchImg = req.file?.path;
  try {
    await User.syncIndexes(); //Genera un código de confirmación aleatorio.
    let confirmationCode = randomCode();
    const { email, name } = req.body;

    /*Busca en bd un usuario con el email y el nombre especificados. 
    Espera el resultado para asegurarse de que la operación asincrónica
    se complete antes de continuar. */

    const userExist = await User.findOne(
      { email: req.body.email },
      { name: req.body.name }
    );
    /*Verifica si no existe un usuario con 
      el correo electrónico y el nombre especificados.
      Si usuario no existe crea una nueva instancia de dicho usuario*/
    if (!userExist) {
      const newUser = new User({ ...req.body, confirmationCode });
      if (req.file) {
        newUser.image = req.file.path;
      } else {
        newUser.image = "https://pic.onlinewebfonts.com/svg/img_181369.png";
      }
      /* Si usuario no tiene img se meterá la img por defecto*/

      //Se crea una nueva asincronía de guardado
      try {
        const userSave = await newUser.save();
        /* Si se ha guardado usuario, se llama a la función "sendEmail" y
        le envío elm */
        if (userSave) {
          sendEmail(email, name, confirmationCode);
          /*Es necesario un Timeout(asicronía). Hasta que función "sendEmail" no finalice,
        no empezará lo siguiente*/
          setTimeout(() => {
            if (getTestEmailSend()) {
              //Se comprueba qué estado tiene.
              /*El estado ya utilizado se reinicializa a false y devuelve 
              un 200.
              */
              setTestEmailSend(false);
              return res.status(200).json({
                user: userSave,
                confirmationCode,
              });
            } else {
              /*Se resetea estado a false y se envía un 404, que hay un error
              y que se reenvíe el código.*/
              setTestEmailSend(false);
              return res.status(404).json({
                user: userSave,
                confirmationCode: "error, resend code",
              });
            }
          }, 1100); //Time out entre 1100 y 1400 milisecs.
        }
      } catch (error) {
        return res.status(404).json(error.message);
      }
    } else {
      if (req.file) deleteImgCloudinary(catchImg);
      return res.status(409).json("this user already exist");
    }
  } catch (error) {
    if (req.file) deleteImgCloudinary(catchImg);
    return next(error);
  }
};

//! -----------------------------------------------------------------------------
//? ----------------------------REGISTER CON REDIRECT----------------------------
//! -----------------------------------------------------------------------------
/*Se crea una función asíncrona llamada "registerWithRedirect" que toma 3
param. 
req = solicitud. res = respuesta. next = próxima función de middleware
Se declara variable "catchImg" y se le asigna la ruta del archivo si
existe en el objeto req. Con operador ? se evita que genere error.*/

const registerWithRedirect = async (req, res, next) => {
  let catchImg = req.file?.path;
  try {
    await User.syncIndexes();
    let confirmationCode = randomCode(); //Genera un código de confirmación aleatorio.
    const userExist = await User.findOne(
      { email: req.body.email },
      { name: req.body.name }
    );
    /*Busca en bd un usuario con el email y el nombre especificados. 
    Espera el resultado para asegurarse de que la operación asincrónica
    se complete antes de continuar. */

    if (!userExist) {
      /*Verifica si no existe un usuario con el correo electrónico y el nombre especificados. */
      const newUser = new User({ ...req.body, confirmationCode });
      if (req.file) {
        newUser.image = req.file.path;
      } else {
        newUser.image = "https://pic.onlinewebfonts.com/svg/img_181369.png";
      }

      try {
        const userSave = await newUser.save();
        const PORT = process.env.PORT;
        if (userSave) {
          return res.redirect(
            303,
            `http://localhost:${PORT}/api/v1/users/register/sendMail/${userSave._id}`
          );

          /*Esta Url he de configurarla yo. Esta ruta me llevará a la const de "sendCode"*/
        }
      } catch (error) {
        return res.status(404).json(error.message);
      }
    } else {
      if (req.file) deleteImgCloudinary(catchImg);
      return res.status(409).json("this user already exist");
    }
  } catch (error) {
    if (req.file) {
      deleteImgCloudinary(catchImg);
    }
    return next(error);
  }
};

//! -----------------------------------------------------------------------------
//? ------------------CONTROLADORES QUE PUEDEN SER REDIRECT --------------------
//! ----------------------------------------------------------------------------

//!!! esto quiere decir que o bien tienen entidad propia porque se llaman por si mismos por parte del cliente
//! o bien son llamados por redirect es decir son controladores de funciones accesorias

const sendCode = async (req, res, next) => {
  try {
    /* Se hace un destructuring de "id". Se saca el param que hemos recibido por la ruta:
    La ruta: http://localhost:${PORT}/api/v1/users/register/sendMail/${userSave._id} */

    const { id } = req.params;

    /*Tomamos ese id para  BUSCAR EL USER POR ID para tener el email y el 
    codigo de confirmacion.
    findById query busca por id.*/
    const userDB = await User.findById(id);

    /// ------------------> envio el codigo
    const emailEnv = process.env.EMAIL;
    const password = process.env.PASSWORD;

    //Se crea el transporte
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailEnv,
        pass: password,
      },
    });

    //Se crean las mismas opciones de envío
    const mailOptions = {
      from: emailEnv,
      to: userDB.email,
      subject: "Confirmation code",
      text: `tu codigo es ${userDB.confirmationCode}, gracias por confiar en nosotros ${userDB.name}`,
    };
    //Se realiza el transport. Si hay error mando un return de 404 con el user y confirm code.
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
        return res.status(404).json({
          user: userDB,
          confirmationCode: "error, resend code",
        });

        //Si no hay error mando un return de 200 con el user y confirm code.
      }
      console.log("Email sent: " + info.response);
      return res.status(200).json({
        user: userDB,
        confirmationCode: userDB.confirmationCode,
      });
    });
  } catch (error) {
    return next(error);
  }
};

//! -----------------------------------------------------------------------------
//? -----------------------RESEND CODE -----------------------------
//! -----------------------------------------------------------------------------
/* Para envíar emails y códigos se necesita la 
librería "Nodemailer", también nos traemos el email y password
try -> scope de bloque.  */
const resendCode = async (req, res, next) => {
  try {
    const email = process.env.EMAIL;
    const password = process.env.PASSWORD;
    /*Hay que hacer el "transporter" ya que nos permite mandar el 
correo. Indica el servicio que tiene y la autenticación ara enviar correo.*/
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: email,
        pass: password,
      },
    });
    /* Se comprueba que User exista. Si no existe no se hace verificación. Se emplea
la Query "findOne" el cual buscará el email de req.body.email. //Mail options*/
    const userExists = await User.findOne({ email: req.body.email });
    // Desde nuestro email al email del req.body.email con asunto de Conf. code junto a texto.
    if (userExists) {
      const mailOptions = {
        from: email,
        to: req.body.email,
        subject: "Confirmation code",
        text: `tu codigo es ${userExists.confirmationCode}`,
      };
      /* Siguiente paso: Realizar método "sendMail" en el transporte, 
    que envía email. 
    "sendEmail" recibe opciones y contiene una 
    callback con 2 param (error e info) que se ejecuta dentro de 
    un función*/

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error); //Se envía la info por console log al front
          return res.status(404).json({
            resend: false,
          });
          /*Si hay error, retorna 404 como que el resend está en false y 
          se saca por consola*/
        } else {
          console.log("Email sent: " + info.response);
          return res.status(200).json({
            resend: true,
          });
        }
      });
      /*En caso de else se ha enviado correo, en console se manda la info
          de la respuesta y se envía al front end un código 200 y un resend 
          que es true*/
    } else {
      //Si User not found mandar error 404
      return res.status(404).json("User not found");
    }
    /* El "catch" general se lanza casi siempre con "next". Con "next" se
  envían cosas que quiero guardar y analizar.
  Se importa el "setError"el cual recibe el código (500) y el 
  mensaje (si no hay el "error.message", con operador or emplea el otro) */
  } catch (error) {
    return next(setError(500, error.message || "Error general send code"));
  }
};

//! ------------------------------------------------------------------------
//? -------------------------- CHECK NEW USER------------------------------
//! ------------------------------------------------------------------------
/* Se crea una función arrow asíncrona.
Se requiere de la req.body el email y código
 de confirmation(el User nos lo da */
const checkNewUser = async (req, res, next) => {
  try {
    const { email, confirmationCode } = req.body;
    // Existe el User?
    const userExists = await User.findOne({ email });

    if (!userExists) {
      //!Si no existe----> Enviamos un 404 de que no se encuentra
      return res.status(404).json("User not found");
    } else {
      /*Si existe, necesitamos comprobar si el código que tenemos en el backend coincide con el del 
    usuario que recibimos por la req.body. Para ello se realiza esta condicional
    en el que se solicita que han de ser estrictamente iguales*/
      if (confirmationCode === userExists.confirmationCode) {
        /* Si el code es igual, realizamos una actualización. 
      Actualizaría el check a true del userExists*/
        try {
          await userExists.updateOne({ check: true });
          /*New query "updateOne" ataca a un elemento en concreto. En este caso solicita
          userExists que actualice la clave check a true*/

          /* Si se ha actualizado algo tengo que volver a buscar el elemento actualizado.
        Creando updateUser.
        Se debe de hacer un test. Con "findOne" solicitamos que encuentre 1 por email.*/
          const updateUser = await User.findOne({ email });

          /* Una vez que el User ha sido encontrado se realiza el test.
          Paso un 200 y un test en el runtime. 
          Se le pregunta si el updateUser tiene true a través de un ternario.
          Si es true, mandará el testCheckOk con true y si no, mandará false.*/
          return res.status(200).json({
            testCheckOk: updateUser.check == true ? true : false,
          });
        } catch (error) {
          return res.status(404).json(error.message);
        }
      } else {
        try {
          /* Si el código no es igual, hacemos un delete que
          borrará a ese User de la bd.
          Se introduce el modelo "User" con el método/query "findById...".*/
          await User.findByIdAndDelete(userExists._id);

          //También se borrará la image en Cloudinary (añado el path the dicha img)
          deleteImgCloudinary(userExists.image);

          // Mando un 200 para confirmar que el User fue borrado.
          return res.status(200).json({
            userExists,
            check: false,

            /* Se realiza un test(runtime testing) con "delete" en el runtime (a tiempo real).
            Se solicita que busque ese User con ese id. Si el User es encontrado da
            la opción "?" que es que ha habido un error en borrar al User.
            Si no lo encuentras es ":", borrar el User. */
            delete: (await User.findById(userExists._id))
              ? "error delete user"
              : "ok delete user",
          });
        } catch (error) {
          return res //"res" es un middleware de express que siempre está antes de las respuestas
            .status(404)
            .json(error.message || "error general delete user");
        } //error.message da más información
      }
    }
  } catch (error) {
    /* Siempre en el catch devolvemos un 500, error general(Interval server error)
    Este error es específico para este controlador. El crasheo rojo del servidor es un error 500. */
    return next(setError(500, error.message || "General error check code"));
  }
}; // next es el middleware.

//! -----------------------------------------------------------------------------
//? --------------------------------LOGIN ---------------------------------------
//! -----------------------------------------------------------------------------

const login = async (req, res, next) => {
  try {
    /* Recibimos por el body el email y password y buscamos
    que con ese email el User exista, que lo encuentre */
    const { email, password } = req.body;
    const userDB = await User.findOne({ email });

    if (userDB) {
      /*SI existe: 
      Tenemos password(contraseña NO encriptada) y userDB.password
      (contraseña encriptada de BD). Se comparan ambas con compareSync. 
      Bcrypt(encriptar) */

      if (bcrypt.compareSync(password, userDB.password)) {
        // Si coinciden generamos el token
        const token = generateToken(userDB._id, email);
        // Se manda la respuesta con el token
        return res.status(200).json({
          user: userDB,
          token,
        });
      } else {
        //Si no son iguales las contraseñas y se le manda este mensaje.
        return res.status(404).json("password dont match");
      }
    } else {
      return res.status(404).json("User no register");
    }
  } catch (error) {
    return next(error);
  }
};

//! -----------------------------------------------------------------------------
//? --------------------------------AUTOLOGIN ---------------------------------------
//! -----------------------------------------------------------------------------
//Compara 2 contraseñas ENCRIPTADAS a diferencia de LOGIN.

const autoLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const userDB = await User.findOne({ email });

    if (userDB) {
      // Comparo dos contraseñas encriptadas
      if (password == userDB.password) {
        const token = generateToken(userDB._id, email);
        return res.status(200).json({
          user: userDB,
          token,
        });
      } else {
        return res.status(404).json("password dont match");
      }
    } else {
      return res.status(404).json("User no register");
    }
  } catch (error) {
    return next(error);
  }
};

//! -----------------------------------------------------------------------------
//? -----------------------CONTRASEÑAS Y SUS CAMBIOS-----------------------------
//! -----------------------------------------------------------------------------

//? -----------------------------------------------------------------------------
//! ------------------CAMBIO DE CONTRASEÑA CUANDO NO ESTÁS LOGADO---------------
//? -----------------------------------------------------------------------------

const changePassword = async (req, res, next) => {
  try {
    /* Se recibe por body el email y va a comprobar que este User 
    existe en la BD con .findOne*/
    const { email } = req.body;
    console.log(req.body);
    const userDb = await User.findOne({ email });
    if (userDb) {
      // Si existe se hace el redirect con 307 que es el más compatible y no hay cambio de método.
      const PORT = process.env.PORT;
      return res.redirect(
        307, //Aquí se pone el local host, mi puerto y el ID del User.
        `http://localhost:${PORT}/api/v1/user/sendPassword/${userDb._id}`
      );
    } else {
      //Si User no existe mandamos un 404.
      return res.status(404).json("User no register");
    }
  } catch (error) {
    return next(error);
  }
};

const sendPassword = async (req, res, next) => {
  try {
    /*Recibimos por los param el id.
     Vamos a buscar al User por el Id del param. */
    const { id } = req.params;
    const userDb = await User.findById(id);
    // Realizamos el envío del correo. Traemos de env el email y password. Y creamos el transport.
    const email = process.env.EMAIL;
    const password = process.env.PASSWORD;
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: email,
        pass: password,
      },
    });

    /*randomPassword se importa del util con el mismo nombre.
    Genero la password con las opciones del email y con un mensaje
    para el User */
    let passwordSecure = randomPassword();
    console.log(passwordSecure);
    const mailOptions = {
      from: email,
      to: userDb.email,
      subject: "-----",
      text: `User: ${userDb.name}. Your new code login is ${passwordSecure} Hemos enviado esto porque tenemos una solicitud de cambio de contraseña, si no has sido ponte en contacto con nosotros, gracias.`,
    };

    //Se envía el email con el transporte. Le envío el correo y las opciones del correo.
    transporter.sendMail(mailOptions, async function (error, info) {
      if (error) {
        // SI HAY UN ERROR MANDO UN 404
        console.log(error);
        return res.status(404).json("dont send email and dont update user");
      } else {
        // SI NO HAY NINGUN ERROR
        console.log("Email sent: " + info.response);
        // Se guarda esta contraseña en Mongo db encriptada.

        //1 ) Encriptamos la contraseña con "hashSync" y le damos 10 vueltas.
        const newPasswordBcrypt = bcrypt.hashSync(passwordSecure, 10);

        try {
          /* Ponemos id para que busque el User por id y ponemos un objeto con 
          las cosas que queremos actualizar si lo encuentra. En este caso la password, por 
          lo que meto la password encriptada.
          "findById..." lo busca y modifica las claves indicadas, en este caso
          se le pide que actualice la contraseña hasheada */
          await User.findByIdAndUpdate(id, { password: newPasswordBcrypt });

          //!------------------ test --------------------------------------------
          // Se vuelve a buscar el User ya actualizado
          const userUpdatePassword = await User.findById(id);

          // Hago un compare sync --> Comparación de  una password no encriptada con una encriptada
          // ---> userUpdatePassword.password ----> encriptada de la BD
          // ---> passwordSecure -----> contraseña no encriptada, la generada.
          if (bcrypt.compareSync(passwordSecure, userUpdatePassword.password)) {
            // Si son iguales es que back se ha actualizado correctamente
            return res.status(200).json({
              updateUser: true,
              sendPassword: true,
            });
          } else {
            /* Si no son iguales se le dice que el correo se mandó 
            pero que no se ha actualizado el User del back en mongo db. */
            return res.status(404).json({
              updateUser: false, //No he actualizado el User
              sendPassword: true, //Se te ha mandado la password
            });
          }
        } catch (error) {
          return res.status(404).json(error.message);
        }
      }
    });
  } catch (error) {
    return next(error);
  }
};

//MODIFY PASSWORD.
/* Vamos a obtener la password antigua y la nueva de la parte 
de la req.body.
Tengo que comprobar que sea la misma contraseña que la del
backend con bcrypt.compareSync.
La req.user.password es el User autenticado.
En caso de que sea igual se realiza la actualización.

Se realiza la contraseña y se hashea.
Si no son iguales, 

Se pone error.message sin el next.
Con next se puede poner solo (error), next es para guardar datos.
*/

//? -----------------------------------------------------------------------------
//! ------------------CAMBIO DE CONTRASEÑA CUANDO YA ESTÁ LOGADO---------
//? -----------------------------------------------------------------------------

const modifyPassword = async (req, res, next) => {
  /* IMPORTANT: REQ.USER ----> ES CREADO POR LOS AUTH MIDDLEWARE */
  console.log("req.user", req.user);

  try {
    const { password, newPassword } = req.body; // Se obtienen la nueva y antigua contraseña de req.body
    const { _id } = req.user;

    /* Se compara la old password sin encriptar y la encriptada con "compareSync" */
    if (bcrypt.compareSync(password, req.user.password)) {
      /* Hay que encriptar la contraseña para guardarla en el backend
      de Mongo DB. Con bcrypt se hashea. */
      const newPasswordHashed = bcrypt.hashSync(newPassword, 10);

      /* Se actualiza la contraseña en Mongo DB tras hashearla. */
      try {
        /* Se hace con await porque es asíncrono. Se mete el modelo User,
        la query "find..." y se mete el id del User que quiero actualizar.
        
        Pongo una , y un object con la clave a modificar, en este caso se pide
       que la password se actualice a la nueva password hasheada. */
        await User.findByIdAndUpdate(_id, { password: newPasswordHashed });

        //?---------TESTING EN TIEMPO REAL---------------------------------------------

        //1) Buscamos y traemos el user actualizado con ·findById"
        const userUpdate = await User.findById(_id);

        // 2) Se compara la contraseña sin encriptar con la del backend encriptada con bcrypt.compareSync
        if (bcrypt.compareSync(newPassword, userUpdate.password)) {
          // SI SON IGUALES 200 ---> UPDATE OK
          return res.status(200).json({
            updateUser: true,
          });
        } else {
          // NO SON IGUALES --> 404 diciendo que updateUser no son iguales
          return res.status(404).json({
            updateUser: false,
          });
        }
      } catch (error) {
        return res.status(404).json(error.message);
      }
    } else {
      // Si contraseñas no son iguales, mando un 404 comunicándolo.
      return res.status(404).json("password dont match");
    }
  } catch (error) {
    return next(error);
    /* Segunda opción :
     * return next(
       setError(
        500,
        error.message || 'Error general to ChangePassword with AUTH'
      )
    );
     */
  }
};

//! -----------------------------------------------------------------------------
//? ---------------------------------UPDATE--------------------------------------
//! -----------------------------------------------------------------------------

const update = async (req, res, next) => {
  // capturamos la imagen nueva subida a cloudinary
  let catchImg = req.file?.path;

  try {
    // actualizamos los elementos unique del modelo
    await User.syncIndexes();

    // instanciamos un nuevo objeto del modelo de user con el req.body
    const patchUser = new User(req.body);

    // si tenemos imagen metemos a la instancia del modelo esta imagen nuevo que es lo que capturamos en catchImg
    req.file && (patchUser.image = catchImg);

    /** vamos a salvaguardar info que no quiero que el usuario pueda cambiarme */
    // AUNQUE ME PIDA CAMBIAR ESTAS CLAVES NO SE LO VOY A CAMBIAR
    patchUser._id = req.user._id;
    patchUser.password = req.user.password;
    patchUser.rol = req.user.rol;
    patchUser.confirmationCode = req.user.confirmationCode;
    patchUser.email = req.user.email;
    patchUser.check = req.user.check;

    if (req.body?.gender) {
      // lo comprobamos y lo metermos en patchUser con un ternario en caso de que sea true o false el resultado de la funcion
      const resultEnum = enumOk(req.body?.gender);
      patchUser.gender = resultEnum.check ? req.body?.gender : req.user.gender;
    }

    try {
      /** hacemos una actualizacion NO HACER CON EL SAVE
       * le metemos en el primer valor el id de el objeto a actualizar
       * y en el segundo valor le metemos la info que queremos actualizar
       */
      await User.findByIdAndUpdate(req.user._id, patchUser);

      // si nos ha metido una imagen nueva y ya la hemos actualizado pues tenemos que borrar la antigua
      // la antigua imagen la tenemos guardada con el usuario autenticado --> req.user
      if (req.file) deleteImgCloudinary(req.user.image);

      // ++++++++++++++++++++++ TEST RUNTIME+++++++++++++++++++++++++++++++++++++++
      /** siempre lo pprimero cuando testeamos es el elemento actualizado para comparar la info que viene
       * del req.body
       */
      const updateUser = await User.findById(req.user._id);

      /** sacamos las claves del objeto del req.body para saber que info nos han pedido actualizar */
      const updateKeys = Object.keys(req.body);

      // creamos un array donde guardamos los test
      const testUpdate = [];

      // recorremos el array de la info que con el req.body nos dijeron de actualizar
      /** recordar este array lo sacamos con el Object.keys */

      // updateKeys ES UN ARRAY CON LOS NOMBRES DE LAS CLAVES = ["name", "email", "rol"]

      ///----------------> para todo lo diferente de la imagen ----------------------------------
      updateKeys.forEach((item) => {
        /** vamos a comprobar que la info actualizada sea igual que lo que me mando por el body... */
        if (updateUser[item] === req.body[item]) {
          /** aparte vamos a comprobar que esta info sea diferente a lo que ya teniamos en mongo subido antes */
          if (updateUser[item] != req.user[item]) {
            // si es diferente a lo que ya teniamos lanzamos el nombre de la clave y su valor como true en un objeto
            // este objeto see pusea en el array que creamos arriba que guarda todos los testing en el runtime
            testUpdate.push({
              [item]: true,
            });
          } else {
            // si son igual lo que pusearemos sera el mismo objeto que arrriba pro diciendo que la info es igual
            testUpdate.push({
              [item]: "sameOldInfo",
            });
          }
        } else {
          testUpdate.push({
            [item]: false,
          });
        }
      });

      /// ---------------------- para la imagen ---------------------------------
      if (req.file) {
        /** si la imagen del user actualizado es estrictamente igual a la imagen nueva que la
         * guardamos en el catchImg, mandamos un objeto con la clave image y su valor en true
         * en caso contrario mandamos esta clave con su valor en false
         */
        updateUser.image === catchImg
          ? testUpdate.push({
              image: true,
            })
          : testUpdate.push({
              image: false,
            });
      }

      /** una vez finalizado el testing en el runtime vamos a mandar el usuario actualizado y el objeto
       * con los test
       */
      return res.status(200).json({
        updateUser,
        testUpdate,
      });
    } catch (error) {
      if (req.file) deleteImgCloudinary(catchImg);
      return res.status(404).json(error.message);
    }
  } catch (error) {
    if (req.file) deleteImgCloudinary(catchImg);
    return next(error);
  }
};

//! -----------------------------------------------------------------------------
//? ---------------------------------DELETE--------------------------------------
//! -----------------------------------------------------------------------------

const deleteUser = async (req, res, next) => {
  try {
    const { _id, image } = req.user;
    await User.findByIdAndDelete(_id);
    if (await User.findById(_id)) {
      // si el usuario
      return res.status(404).json("not deleted"); ///
    } else {
      deleteImgCloudinary(image);
      return res.status(200).json("ok delete");
    }
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  registerLargo,
  register,
  sendCode,
  registerWithRedirect,
  resendCode,
  checkNewUser,
  login,
  autoLogin,
  changePassword,
  sendPassword,
  modifyPassword,
  update,
  deleteUser,
};
