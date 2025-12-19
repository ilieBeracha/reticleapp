import ExpoModulesCore
import ConnectIQ

// Singleton to store devices - accessible within this module
public class GarminDeviceStore: NSObject, IQDeviceEventDelegate {
  public static let shared = GarminDeviceStore()
  public var devices: [UUID: IQDevice] = [:]
  
  private override init() {
    super.init()
  }
  
  public func deviceStatusChanged(_ device: IQDevice, status: IQDeviceStatus) {
    NotificationCenter.default.post(
      name: NSNotification.Name("GarminDeviceStatusChanged"),
      object: nil,
      userInfo: ["deviceId": device.uuid.uuidString, "status": status.rawValue]
    )
  }
}

public class ExpoGarminModule: Module {
  
  public func definition() -> ModuleDefinition {
    Name("ExpoGarmin")
    
    Events("onDevicesUpdated", "onDeviceStatusChanged", "onMessageReceived")
    
    OnCreate {
      NotificationCenter.default.addObserver(
        forName: NSNotification.Name("GarminDevicesUpdated"),
        object: nil,
        queue: .main
      ) { [weak self] _ in
        self?.sendDevicesUpdatedEvent()
      }
      
      NotificationCenter.default.addObserver(
        forName: NSNotification.Name("GarminDeviceStatusChanged"),
        object: nil,
        queue: .main
      ) { [weak self] notification in
        if let userInfo = notification.userInfo {
          self?.sendEvent("onDeviceStatusChanged", [
            "deviceId": userInfo["deviceId"] ?? "",
            "status": userInfo["status"] ?? 0
          ])
        }
      }
      
      // Listen for device selection from URL callback
      NotificationCenter.default.addObserver(
        forName: NSNotification.Name("GarminDevicesReceived"),
        object: nil,
        queue: .main
      ) { notification in
        if let devices = notification.userInfo?["devices"] as? [IQDevice] {
          GarminDeviceStore.shared.devices.removeAll()
          for device in devices {
            GarminDeviceStore.shared.devices[device.uuid] = device
            ConnectIQ.sharedInstance()?.register(forDeviceEvents: device, delegate: GarminDeviceStore.shared)
          }
        }
      }
    }
    
    Function("showDeviceSelection") {
      DispatchQueue.main.async {
        ConnectIQ.sharedInstance()?.showDeviceSelection()
      }
    }
    
    AsyncFunction("getConnectedDevices") { (promise: Promise) in
      DispatchQueue.main.async {
        let devices = GarminDeviceStore.shared.devices.values.map { device -> [String: Any] in
          return [
            "uuid": device.uuid.uuidString,
            "friendlyName": device.friendlyName ?? "Unknown Device",
            "modelName": device.modelName ?? "Unknown Model"
          ]
        }
        promise.resolve(devices)
      }
    }
    
    AsyncFunction("sendMessage") { (message: [String: Any], appId: String, promise: Promise) in
      DispatchQueue.main.async {
        guard let device = GarminDeviceStore.shared.devices.values.first else {
          promise.reject("NO_DEVICE", "No connected device found")
          return
        }
        
        guard let appUUID = UUID(uuidString: appId) else {
          promise.reject("INVALID_APP_ID", "Invalid app ID format")
          return
        }
        
        guard let connectIQ = ConnectIQ.sharedInstance() else {
          promise.reject("SDK_ERROR", "ConnectIQ SDK not initialized")
          return
        }
        
        let app = IQApp(uuid: appUUID, store: UUID(), device: device)
        
        connectIQ.sendMessage(
          message as NSDictionary,
          to: app,
          progress: { sent, total in },
          completion: { result in
            if result == .success {
              promise.resolve(["success": true])
            } else {
              promise.reject("SEND_FAILED", "Failed to send message: \(result.rawValue)")
            }
          }
        )
      }
    }
    
    AsyncFunction("getAppStatus") { (appId: String, promise: Promise) in
      DispatchQueue.main.async {
        guard let device = GarminDeviceStore.shared.devices.values.first else {
          promise.reject("NO_DEVICE", "No connected device found")
          return
        }
        
        guard let appUUID = UUID(uuidString: appId) else {
          promise.reject("INVALID_APP_ID", "Invalid app ID format")
          return
        }
        
        guard let connectIQ = ConnectIQ.sharedInstance() else {
          promise.reject("SDK_ERROR", "ConnectIQ SDK not initialized")
          return
        }
        
        let app = IQApp(uuid: appUUID, store: UUID(), device: device)
        
        connectIQ.getAppStatus(app) { status in
          if let status = status {
            promise.resolve([
              "isInstalled": status.isInstalled,
              "version": status.version
            ])
          } else {
            promise.reject("STATUS_FAILED", "Could not get app status")
          }
        }
      }
    }
    
    AsyncFunction("openAppOnDevice") { (appId: String, promise: Promise) in
      DispatchQueue.main.async {
        guard let device = GarminDeviceStore.shared.devices.values.first else {
          promise.reject("NO_DEVICE", "No connected device found")
          return
        }
        
        guard let appUUID = UUID(uuidString: appId) else {
          promise.reject("INVALID_APP_ID", "Invalid app ID format")
          return
        }
        
        guard let connectIQ = ConnectIQ.sharedInstance() else {
          promise.reject("SDK_ERROR", "ConnectIQ SDK not initialized")
          return
        }
        
        let app = IQApp(uuid: appUUID, store: UUID(), device: device)
        
        connectIQ.openAppRequest(app) { result in
          if result == .success {
            promise.resolve(["success": true])
          } else {
            promise.reject("OPEN_FAILED", "Failed to open app: \(result.rawValue)")
          }
        }
      }
    }
  }
  
  private func sendDevicesUpdatedEvent() {
    let devices = GarminDeviceStore.shared.devices.values.map { device -> [String: Any] in
      return [
        "uuid": device.uuid.uuidString,
        "friendlyName": device.friendlyName ?? "Unknown Device",
        "modelName": device.modelName ?? "Unknown Model"
      ]
    }
    sendEvent("onDevicesUpdated", ["devices": devices])
  }
}