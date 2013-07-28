#include <node.h>
#include <stdio.h>
#include <AudioToolbox/AudioServices.h>

using namespace v8;

AudioDeviceID outputDeviceID = kAudioObjectUnknown;
UInt32 propertySize = 0;
OSStatus status = noErr;
AudioObjectPropertyAddress propertyAOPA;
Float32 volumeToSet;

void foo() {
  propertyAOPA.mElement = kAudioObjectPropertyElementMaster;
  propertyAOPA.mScope = kAudioObjectPropertyScopeGlobal;
  propertyAOPA.mSelector = kAudioHardwarePropertyDefaultOutputDevice;
  propertySize = sizeof(AudioDeviceID);

  status = AudioHardwareServiceGetPropertyData(kAudioObjectSystemObject, &propertyAOPA, 0, NULL, &propertySize, &outputDeviceID); 

  propertyAOPA.mElement = kAudioObjectPropertyElementMaster;
  propertyAOPA.mScope = kAudioDevicePropertyScopeOutput;
  propertyAOPA.mSelector = kAudioHardwareServiceDeviceProperty_VirtualMasterVolume;
  propertySize = sizeof(Float32);

}

void bar(double vol) {
  if (vol > 1.0)
    volumeToSet = 1.0;
  else
    volumeToSet = vol;

  AudioHardwareServiceSetPropertyData(outputDeviceID, &propertyAOPA, 0, NULL, propertySize, &volumeToSet);   
}

Handle<Value> SetVol(const Arguments& args) {
  HandleScope scope;

  if (args.Length() < 1) {
    ThrowException(Exception::TypeError(String::New("Wrong number of arguments")));
    return scope.Close(Undefined());
  }

  if (!args[0]->IsNumber()) {
    ThrowException(Exception::TypeError(String::New("Wrong arguments")));
    return scope.Close(Undefined());
  }

  bar(args[0]->NumberValue());
  return v8::Boolean::New(true);
}

void Init(Handle<Object> exports) {
  foo();
  exports->Set(String::NewSymbol("setVol"),
      FunctionTemplate::New(SetVol)->GetFunction());
}

NODE_MODULE(audio, Init)
