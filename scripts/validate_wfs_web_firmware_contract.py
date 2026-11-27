#!/usr/bin/env python3
"""Guard the Web Studio ↔ ESP32 WFS v1 wire and package contract."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit("[WFS CONTRACT] " + message)


app = read("web/app.js")
studio = read("web/template-studio.js")
compat = read("web/device-compatibility.js")
protocol_h = read("src/communication/protocol.h")
protocol_cpp = read("src/communication/protocol.cpp")
ble = read("src/communication/ble_manager.cpp")
ble_service = read("src/services/ble_service.cpp")
transfer = read("src/communication/transfer_manager.cpp")
validator = read("src/watchface/package_validator.cpp")
face_manager = read("src/watchface/face_manager.cpp")
renderer = read("src/watchface/face_renderer.cpp")
sequence_h = read("src/communication/transfer_sequence.h")

# The browser's GATT characteristics must be the firmware's exact UUIDs.
web_uuid_block = re.search(r"const WFS_UUID=\{([^}]+)\}", app)
require(web_uuid_block is not None, "Web WFS GATT UUID table is missing")
web_uuids = dict(re.findall(r"(service|controlRx|controlTx|dataRx|dataTx):'([^']+)'", web_uuid_block.group(1)))
firmware_uuid_names = {
    "service": "SERVICE_UUID",
    "controlRx": "CONTROL_RX_UUID",
    "controlTx": "CONTROL_TX_UUID",
    "dataRx": "DATA_RX_UUID",
    "dataTx": "DATA_TX_UUID",
}
for web_name, firmware_name in firmware_uuid_names.items():
    match = re.search(rf'constexpr char {firmware_name}\[\] = "([^"]+)";', protocol_h)
    require(match is not None, f"Firmware {firmware_name} is missing")
    require(web_uuids.get(web_name) == match.group(1),
            f"GATT UUID mismatch for {web_name}: Web={web_uuids.get(web_name)!r}, firmware={match.group(1)!r}")

# Keep the message IDs used by Web upload and firmware dispatch identical.
enum_block = re.search(r"enum class MessageType : uint8_t \{(.*?)\};", protocol_h, re.S)
require(enum_block is not None, "Firmware WFS MessageType enum is missing")
message_ids = {
    name: int(value, 16)
    for name, value in re.findall(r"(\w+)\s*=\s*(0x[0-9A-Fa-f]+)", enum_block.group(1))
}
web_message_ids = {
    "Hello": 0x01, "HelloAck": 0x02,
    "GetCapabilities": 0x03, "Capabilities": 0x04,
    "GetStatus": 0x05, "Status": 0x06,
    "GetFaceStatus": 0x07, "FaceStatus": 0x08,
    "TransferBegin": 0x20, "TransferReady": 0x21,
    "Data": 0x22, "DataAck": 0x23,
    "TransferEnd": 0x24, "VerifyResult": 0x25,
    "Apply": 0x26, "ApplyResult": 0x27, "Cancel": 0x28,
}
for name, value in web_message_ids.items():
    require(message_ids.get(name) == value, f"WFS message ID mismatch for {name}")
    require(f"0x{value:02x}" in app.lower(), f"Web app no longer references WFS message 0x{value:02x}")

# The 16-byte frame header is encoded/decoded in the same byte order.
require("FRAME_HEADER_SIZE = 16" in protocol_h, "Firmware frame header must remain 16 bytes")
for token in [
    "frame[0]=0x57", "frame[1]=0x46", "frame[2]=1", "frame[3]=0",
    "view.setUint16(6,w.txSequence++,true)",
    "view.setUint32(8,sessionOverride===undefined?w.sessionId:sessionOverride,true)",
    "view.setUint16(12,payload.length,true)",
    "view.setUint16(14,wfsCrc16(frame.subarray(0,14)),true)",
]:
    require(token in app, f"Web frame encoder contract missing: {token}")
for token in [
    "bytes[0] != MAGIC_0", "bytes[1] != MAGIC_1",
    "readU16(bytes + 12)", "readU16(bytes + 14)",
    "readU32(bytes + 8)", "readU16(bytes + 6)",
    "crc16CcittFalse(bytes, 14)",
]:
    require(token in protocol_cpp, f"Firmware frame decoder contract missing: {token}")

# The maximum data packet is 240 bytes: 16-byte frame + 8-byte transfer
# envelope + 216-byte stop-and-wait chunk.
require("MAX_DATA_FRAME_BYTES = 240" in protocol_h, "Firmware data frame limit changed")
require("MAX_CHUNK_BYTES = 216" in sequence_h, "Firmware chunk limit changed")
require("return available < 216 ? available : 216;" in ble,
        "Firmware MTU negotiation no longer caps chunks at 216 bytes")
require("const chunkSize=Math.min(216,ready.chunkSize)" in app,
        "Web upload chunk size no longer follows the firmware's negotiated limit")
require("const payload=new Uint8Array(8+chunk.length)" in app,
        "Web data packet must contain transferId and chunkIndex before chunk bytes")
require("frame.payloadLength <= 8" in ble and "frame.payload + 8" in ble,
        "Firmware data receiver must parse the same 8-byte chunk envelope")
require("uint8_t payload[14] = {}" in ble, "Firmware DataAck payload must remain 14 bytes")
for token in [
    "ackView.getUint32(0,true)", "ackView.getUint32(4,true)",
    "ackView.getUint32(8,true)", "ack.payload[12]",
]:
    require(token in app, f"Web DataAck parser is missing {token}")
for token in ["writeU32(payload, transferId)", "writeU32(payload + 4", "writeU32(payload + 8", "payload[12]"]:
    require(token in ble, f"Firmware DataAck field is missing: {token}")

# Verify the control-plane request/response fields are shared.
for field in ["transferId", "packageLength", "payloadSha256", "designId"]:
    require(field in app and f'request["{field}"]' in ble,
            f"TransferBegin field mismatch: {field}")
for message in ["TransferBegin", "TransferEnd", "Apply", "Cancel"]:
    require(f"MessageType::{message}" in ble, f"Firmware does not dispatch {message}")
require("sendWfsJsonAndWait(0x20" in app and "sendWfsJsonAndWait(0x24" in app and
        "sendWfsJsonAndWait(0x26" in app,
        "Web must perform BEGIN, VERIFY and APPLY with acknowledgements")

# The Web WFS1 package header must match the firmware validator's offsets.
require("constexpr size_t WFS_HEADER_SIZE = 64" in validator,
        "Firmware WFS1 header size changed")
for token in [
    "header.set([0x57,0x46,0x53,0x31],0)",
    "view.setUint16(4,1,true)", "view.setUint16(6,64,true)",
    "view.setUint32(8,manifestBytes.length,true)",
    "view.setUint32(12,layoutBytes.length,true)",
    "view.setUint16(16,packageAssets.length,true)",
    "view.setUint32(20,payload.length,true)",
    "header.set(payloadDigest,24)",
    "view.setUint32(56,wfsCrc32(header.subarray(0,56)),true)",
]:
    require(token in app, f"Web WFS1 header encoder contract missing: {token}")
for token in [
    "memcmp(header, WFS_MAGIC, sizeof(WFS_MAGIC))",
    "readU16(header + 6) != WFS_HEADER_SIZE",
    "readU16(header + 4) != 1",
    "readU32(header + 8)", "readU32(header + 12)",
    "readU16(header + 16)", "readU32(header + 20)",
    "crc32Iso(header, 56) != readU32(header + 56)",
]:
    require(token in validator, f"Firmware WFS1 header validator missing: {token}")

# RGB565 assets are a shared binary contract, not browser-only image previews.
for token in ["mediaType:'image/rgb565'", "encoding:'rgb565le'", "converted.bytes.length"]:
    require(token in app, f"Web image package field missing: {token}")
for token in ['strcmp(encoding, "rgb565le")', 'strcmp(mediaType, "image/rgb565")',
              "byteLength != width * height * 2U"]:
    require(token in validator, f"Firmware image asset validator missing: {token}")
require("FaceElementType::Image" in renderer and "beginImageRenderPass()" in renderer,
        "Firmware image renderer path is missing")

# Firmware advertises compact element codes; Web must decode those exact codes.
require("t,dc,ac,d,w,s,i" in ble, "Firmware capability element list changed")
for token in [
    "t: 'text'", "dc: 'digital-clock'", "ac: 'analog-clock'",
    "d: 'date'", "w: 'weather'", "s: 'shape'", "i: 'image'",
]:
    require(token in compat, f"Web capability decoder is missing firmware element code: {token}")
require('strcmp(value, "weather.condition") == 0' in validator,
        "Firmware weather-condition capability is not supported")

# Template Studio must feed its generated design into the same WFS1 uploader.
require("module.createObjects(spec,assetId)" in studio,
        "Template Studio no longer creates firmware-backed WFS objects")
require("await uploadCurrentDesign()" in studio,
        "Template Studio upload button is not connected to the WFS uploader")
require("async function buildWfsPackage(design)" in app and
        "async function uploadCurrentDesign()" in app,
        "Web package builder or transfer entry point is missing")

# Confirm the BLE service is actually started and serviced by the firmware loop.
require("beginWfsGatt(bleServer)" in ble_service,
        "Legacy BLE startup does not register the WFS GATT service")
require("serviceWfsBle();" in ble_service and "handleDataPacket(packet)" in ble,
        "Firmware application loop does not service queued WFS data packets")
require("TransferManager::finish(transferId)" in ble and
        "TransferManager::apply(transferId)" in ble,
        "Firmware does not verify and apply received packages")
require("validateWfsPackage(packageFile" in transfer and
        "FaceStorage::activateSlot(stagingSlot)" in transfer and
        "FaceManager::setActiveModel(verifiedFace)" in transfer,
        "Firmware does not validate, atomically activate and install the received face")
require("validateWfsPackage(packageFile" in face_manager,
        "Firmware boot recovery does not validate the active WFS1 package")

# WFS transfer and validation should avoid unnecessary peak heap and flash I/O.
manifest_parse = re.search(
    r"deserializeJson\(manifest,\s*file,\s*DeserializationOption::NestingLimit\(8\)\)",
    validator,
)
require(manifest_parse is not None, "Firmware must parse the manifest directly from SPIFFS")
require("malloc(manifestLength + 1)" not in validator,
        "Firmware must not allocate a duplicate manifest text buffer")
write_chunk = re.search(r"bool writeChunk\(.*?\n}\n\nbool finish", transfer, re.S)
require(write_chunk is not None, "TransferManager::writeChunk implementation is missing")
require(".flush()" not in write_chunk.group(0),
        "TransferManager must not force a SPIFFS flush for every data chunk")
finish_transfer = re.search(r"bool finish\(.*?\n}\n\nbool apply", transfer, re.S)
require(finish_transfer is not None and "stagingFile.flush()" in finish_transfer.group(0),
        "TransferManager must flush staged package data before verification")

print("[WFS CONTRACT] Web Studio, BLE transport, WFS1 package, assets and firmware receiver are aligned.")
