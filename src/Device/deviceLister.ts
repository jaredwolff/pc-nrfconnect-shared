/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import nrfDeviceLib, {
    Device as NrfdlDevice,
    DeviceTraits,
    HotplugEvent,
} from '@nordicsemiconductor/nrf-device-lib-js';
import type { Device } from 'pc-nrfconnect-shared';

import logger from '../logging';
import { RootState, TDispatch } from '../state';
import { getDeviceLibContext } from './deviceLibWrapper';
import { addDevice, removeDevice, setDevices } from './deviceSlice';

const DEFAULT_DEVICE_WAIT_TIME_MS = 3000;

let hotplugTaskId: number;

/**
 * Wrap the device form nrf-device-lib to make the Device type consistent
 *
 * @param {Device} device The input device from nrf-device-lib
 * @returns {Device} The updated device
 */
export const wrapDeviceFromNrfdl = (device: NrfdlDevice): Device => ({
    ...device,
    boardVersion: device.jlink?.boardVersion ?? undefined,
    serialport: device.serialPorts?.[0] ?? undefined,
});

/**
 * Wrap the device form nrf-device-lib to make the Device type consistent
 *
 * @param {Device[]} devices The input devices from nrf-device-lib
 * @returns {Device[]} The updated devices
 */
export const wrapDevicesFromNrfdl = (devices: NrfdlDevice[]): Device[] =>
    devices.map(wrapDeviceFromNrfdl);

export const hasValidDeviceTraits = (
    deviceTraits: DeviceTraits,
    requiredTraits: DeviceTraits
) =>
    Object.keys(requiredTraits).some(
        rule =>
            deviceTraits[rule as keyof DeviceTraits] &&
            requiredTraits[rule as keyof DeviceTraits]
    ) ||
    Object.keys(requiredTraits).every(
        rule => requiredTraits[rule as keyof DeviceTraits] === false
    );

/*
 * Starts watching for devices with the given traits. See the nrf-device-lib
 * library for available traits. Whenever devices are attached/detached, this
 * will dispatch AddDevice or removeDevice and trigger events.
 */
export const startWatchingDevices =
    (
        deviceListing: DeviceTraits,
        onDeviceConnected: (device: Device) => void,
        onDeviceDisconnected: (device: Device) => void,
        onDeviceDeselected: () => void
    ) =>
    async (dispatch: TDispatch, getState: () => RootState) => {
        const updateDeviceList = (event: HotplugEvent) => {
            switch (event.event_type) {
                case 'NRFDL_DEVICE_EVENT_ARRIVED':
                    if (!event.device) {
                        return;
                    }
                    if (
                        hasValidDeviceTraits(
                            event.device?.traits,
                            deviceListing
                        )
                    ) {
                        const device = wrapDeviceFromNrfdl(event.device);
                        if (
                            !getState().device.devices.has(device.serialNumber)
                        ) {
                            onDeviceConnected(device);
                        }
                        dispatch(addDevice(device));
                    }
                    break;
                case 'NRFDL_DEVICE_EVENT_LEFT':
                    {
                        const devices = getState().device.devices;

                        let toRemove: Device | undefined;
                        devices.forEach(device => {
                            if (device.id === event.device_id) {
                                toRemove = device;
                            }
                        });

                        if (toRemove) {
                            if (
                                toRemove?.serialNumber ===
                                getState().device.selectedSerialNumber
                            ) {
                                onDeviceDeselected();
                            }
                            dispatch(removeDevice(toRemove));
                            onDeviceDisconnected(toRemove);
                        }
                    }
                    break;
            }
        };

        try {
            const nrfdlDevices = await nrfDeviceLib.enumerate(
                getDeviceLibContext(),
                deviceListing
            );
            const currentDevices = wrapDevicesFromNrfdl(nrfdlDevices);
            dispatch(setDevices(currentDevices));

            hotplugTaskId = nrfDeviceLib.startHotplugEvents(
                getDeviceLibContext(),
                () => {},
                updateDeviceList
            );
        } catch (error) {
            logger.logError(
                'Error while probing devices, more details in the debug log',
                error
            );
        }
    };

/**
 * Stops watching for devices.
 *
 * @returns {undefined}
 */
export const stopWatchingDevices = () => {
    // Not sure, if this guard clause is really needed
    if (getDeviceLibContext()) {
        try {
            nrfDeviceLib.stopHotplugEvents(hotplugTaskId);
        } catch (error) {
            logger.logError('Error while stopping to watch devices', error);
        }
    }
};

const DEFAULT_TRAITS: DeviceTraits = {
    serialPorts: true,
};

/**
 * Waits until a device (with a matching serial number) is listed by
 * nrf-device-lister, up to a maximum of `timeout` milliseconds.
 *
 * If `expectedTraits` is given, then the device must (in addition to
 * a matching serial number) also have the given traits. See the
 * nrf-device-lister library for the full list of traits.
 *
 * @param {string} serialNumber of the device expected to appear
 * @param {number} [timeout] Timeout, in milliseconds, to wait for device enumeration
 * @param {DeviceTraits} [expectedTraits] The traits that the device is expected to have
 * @returns {Promise} resolved to the expected device
 */
export const waitForDevice = (
    serialNumber: string,
    timeout = DEFAULT_DEVICE_WAIT_TIME_MS,
    expectedTraits: DeviceTraits = DEFAULT_TRAITS
) => {
    logger.debug(`Will wait for device ${serialNumber}`);
    return new Promise<Device>((resolve, reject) => {
        let timeoutId: NodeJS.Timeout;

        nrfDeviceLib.enumerate(getDeviceLibContext(), expectedTraits);
        const hotplugEventsId = nrfDeviceLib.startHotplugEvents(
            getDeviceLibContext(),
            () => {},
            (event: HotplugEvent) => {
                const { device: nrfdlDevice } = event;
                if (!nrfdlDevice) return;

                const device = wrapDeviceFromNrfdl(nrfdlDevice);
                const isTraitIncluded = () =>
                    Object.keys(expectedTraits).every(
                        trait => device.traits[trait as keyof DeviceTraits]
                    );
                if (
                    device &&
                    device.serialNumber === serialNumber &&
                    isTraitIncluded()
                ) {
                    clearTimeout(timeoutId);
                    nrfDeviceLib.stopHotplugEvents(hotplugEventsId);
                    resolve(device);
                }
            }
        );
        timeoutId = setTimeout(() => {
            logger.debug(
                `Timeout when waiting for attachment of device with serial number ${serialNumber}`
            );
            nrfDeviceLib.stopHotplugEvents(hotplugEventsId);
            reject(
                new Error(
                    `Timeout while waiting for device  ${serialNumber} to be attached and enumerated`
                )
            );
        }, timeout);
    });
};
