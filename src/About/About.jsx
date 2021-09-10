/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';

import ApplicationCard from './ApplicationCard';
import DeviceCard from './DeviceCard';
import SupportCard from './SupportCard';

import './about.scss';

export default () => (
    <div className="about">
        <ApplicationCard />
        <DeviceCard />
        <SupportCard />
    </div>
);
