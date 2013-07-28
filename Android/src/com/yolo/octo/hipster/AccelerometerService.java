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
    PowerManager.WakeLock wakeLock;
    int deviceID;

    @Override
    public void onCreate() {
        Log.v(TAG, "AccelerometerService created");

        PowerManager mgr = (PowerManager)this.getSystemService(Context.POWER_SERVICE);
        wakeLock = mgr.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "MyWakeLock");
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
        wakeLock.acquire();
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
        wakeLock.release();
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
            socket.send("HELLO SERVER");
            Log.v(TAG, "ToServer connecting");
        }

        public void sendAccelerometer(float[] values) {
            try {
                Log.v(TAG, "Device ID:  " + deviceID);
                socket.emit("accelerometer", new JSONObject("{x:"+values[0]+", y: "+values[1]+", z: "+values[2]+", id: "+ deviceID +"}"));
            } catch (JSONException e) {
                e.printStackTrace();
            }


        }
        @Override
        public void onMessage(JSONObject json, IOAcknowledge ack) {
            Log.v(TAG, "ToServer Message: " + json);
        }

        @Override
        public void onMessage(String data, IOAcknowledge ack) {
            Log.v(TAG, "ToServer Message: " + data);
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
            Log.v(TAG,"ToServer Event occurred: " +event );
            Log.v(TAG, "ToServer Event data: " + args[0] );
            ServerID id = gson.fromJson(args[0].toString(), ServerID.class);
            if(id.id != 0) {
                Log.v(TAG, "ToServer ID: " + id.id );
                deviceID = id.id;
            }
        }
    }

}