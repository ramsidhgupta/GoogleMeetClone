const express = require("express");
const path = require("path");
var app = express();
const PORT = process.env.PORT || 3000;
var server = app.listen(PORT, function () {
  console.log("Listening on Port 3000");
});
const fs = require("fs");
const fileUpload = require("express-fileupload");
const io = require("socket.io")(server, { allowEIO3: true });
app.use(express.static(path.join(__dirname, "")));

var userConnection = [];

io.on("connection", (socket) => {
  console.log("Socket ID is ", socket.id);
  socket.on("userconnect", (data) => {
    console.log("userconnect", data.displayName, data.meetingid);

    var other_users = userConnection.filter(
      (p) => p.meeting_id == data.meetingid
    );

    userConnection.push({
      connectionId: socket.id,
      user_id: data.displayName,
      meeting_id: data.meetingid,
    });
    var userCount = userConnection.length;
    other_users.forEach((v) => {
      socket.to(v.connectionId).emit("inform_others_about_me", {
        other_user_id: data.displayName,
        connId: socket.id,
        userNumber: userCount,
      });
    });
    socket.emit("inform_me_about_other_user", other_users);
  });
  socket.on("SDPProcess", (data) => {
    socket.to(data.to_connid).emit("SDPProcess", {
      message: data.message,
      from_connid: socket.id,
    });
  });

  socket.on("sendMessage", (msg) => {
    console.log(msg);
    var mUser = userConnection.find((p) => p.connectionId == socket.id);
    if (mUser) {
      var meetingid = mUser.meeting_id;
      var from = mUser.user_id;
      var list = userConnection.filter((p) => p.meeting_id == meetingid);
      list.forEach((v) => {
        socket.to(v.connectionId).emit("showChatMessage", {
          from: from,
          message: msg,
        });
      });
    }
  });

  socket.on("fileTransferToOther", (msg) => {
    console.log(msg);
    var mUser = userConnection.find((p) => p.connectionId == socket.id);
    if (mUser) {
      var meetingid = mUser.meeting_id;
      var from = mUser.user_id;
      var list = userConnection.filter((p) => p.meeting_id == meetingid);
      list.forEach((v) => {
        socket.to(v.connectionId).emit("showFileMessage", {
          username: msg.username,
          meetingid: msg.meetingid,
          filePath: msg.filePath,
          fileName: msg.fileName,
        });
      });
    }
  });

  socket.on("disconnect", function () {
    console.log("Disconnected");
    var disUser = userConnection.find((p) => p.connectionId == socket.id);
    if (disUser) {
      var meetingid = disUser.meeting_id;
      userConnection = userConnection.filter(
        (p) => p.connectionId != socket.id
      );
      var list = userConnection.filter((p) => p.meeting_id == meetingid);
      list.forEach((v) => {
        var UserNumberAfUserLeave = userConnection.length;
        socket.to(v.connectionId).emit("inform_other_about_disconnected_user", {
          connId: socket.id,
          uNumber: UserNumberAfUserLeave,
        });
      });
    }
  });
});
app.use(fileUpload());
app.post("/attachimg", function (req, res) {
  var data = req.body;
  var imageFile = req.files.zipfile;
  console.log(imageFile);
  var dir = "public/attachment/" + data.meeting_id + "/";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  imageFile.mv(
    "public/attachment/" + data.meeting_id + "/" + imageFile.name,
    function (error) {
      if (error) {
        console.log("Couldn't Upload the Image File, Error: ", error);
      } else {
        console.log("Image File Successfully Uploaded");
      }
    }
  );
});
