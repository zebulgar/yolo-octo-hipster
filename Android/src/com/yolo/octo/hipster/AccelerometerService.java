package com.yolo.octo.hipster;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;
import android.widget.TextView;
import com.google.gson.Gson;
import io.socket.IOAcknowledge;
import io.socket.IOCallback;
import io.socket.SocketIO;
import io.socket.SocketIOException;
import org.json.JSONException;
import org.json.JSONObject;

import javax.net.ssl.SSLContext;
import java.io.FileInputStream;
import java.io.IOException;

public class AccelerometerService extends Service implements SensorEventListener{
    private SensorManager sensorManager;
    private long lastUpdate;
    private boolean moving = false;
    private static final String TAG = "Nightingale";
    private String regId;
    long lastPickedUp = 0;
    ToServer tos;

    @Override
    public void onCreate() {
        Log.v(TAG, "AccelerometerService created");

        PowerManager mgr = (PowerManager)this.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = mgr.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "MyWakeLock");
        wakeLock.acquire();

        sensorManager = (SensorManager) getSystemService(SENSOR_SERVICE);
        sensorManager.registerListener((SensorEventListener) this,sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER),
                SensorManager.SENSOR_DELAY_NORMAL);
        try {
            Log.v(TAG, "ToServer created");
            tos = new ToServer();

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onDestroy() {
        Log.v(TAG, "AccelerometerService destroyed");
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
            float[] values = event.values;
            // Movement
            float x = values[0];
            float y = values[1];
            float z = values[2];

//            float max = Math.max(Math.max(Math.abs(x), Math.abs(y)), Math.abs(z));
            float max = 9.81f;

           for (int i = 0; i < 3; i ++)
            values[i] = values[i]/max;

            tos.sendAccelerometer(values);

        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
    }


    public class ToServer implements IOCallback {
        private SocketIO socket;
        private Gson gson = new Gson();

        public ToServer() throws Exception {
            SocketIO.setDefaultSSLSocketFactory(SSLContext.getDefault());
            SocketIO.setDefaultSSLSocketFactory(SSLContext.getInstance("Default"));
            socket = new SocketIO("http://172.16.240.165:3000/", this);
            socket.emit("request", "SERVER RECIEVED ANDROID");
            socket.send("HELLO SERVER");
            Log.v(TAG, "ToServer connecting");
        }

        public void sendAccelerometer(float[] values) {
            socket.emit("request", "{x:"+values[0]+", y: "+values[1]+", z: "+values[2]+"}");

        }
        @Override
        public void onMessage(JSONObject json, IOAcknowledge ack) {
            System.out.println("MESSAGE: " + json);
        }

        @Override
        public void onMessage(String data, IOAcknowledge ack) {
            System.out.println("MESSAGE: " + data);
        }

        @Override
        public void onError(SocketIOException socketIOException) {
            Log.v(TAG, "ToServer Error Occurred: ");
            socketIOException.printStackTrace();
        }

        @Override
        public void onDisconnect() {
            Log.v(TAG, "ToServer connection terminated");
        }

        @Override
        public void onConnect() {
            Log.v(TAG, "ToServer connection established");
        }

        @Override
        public void on(String event, IOAcknowledge ack, Object... args) {
            Log.d("Event",event );
        }
    }

}