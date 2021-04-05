// Copyright (c) 2019 The Zcash developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or https://www.opensource.org/licenses/mit-license.php .

#include "params.h"

#include <amount.h>
#include <key_io.h>
#include <script/standard.h>
#include "upgrades.h"
#include "util.h"

namespace Consensus {
    bool Params::NetworkUpgradeActive(int nHeight, Consensus::UpgradeIndex idx) const {
        return NetworkUpgradeState(nHeight, *this, idx) == UPGRADE_ACTIVE;
    }

    bool Params::FeatureRequired(const Consensus::ConsensusFeature feature) const {
        return vRequiredFeatures.count(feature) > 0;
    }

    bool Params::FeatureActive(const int nHeight, const Consensus::ConsensusFeature feature) const {
        return Features.FeatureActive(*this, nHeight, feature);
    }

    bool Params::FutureTimestampSoftForkActive(int nHeight) const {
        return nHeight >= nFutureTimestampSoftForkHeight;
    }

    int64_t Params::PoWTargetSpacing(int nHeight) const {
        return nPowTargetSpacing;
    }

    int64_t Params::AveragingWindowTimespan(int nHeight) const {
        return nPowAveragingWindow * PoWTargetSpacing(nHeight);
    }

    int64_t Params::MinActualTimespan(int nHeight) const {
        return (AveragingWindowTimespan(nHeight) * (100 - nPowMaxAdjustUp)) / 100;
    }

    int64_t Params::MaxActualTimespan(int nHeight) const {
        return (AveragingWindowTimespan(nHeight) * (100 + nPowMaxAdjustDown)) / 100;
    }
}
