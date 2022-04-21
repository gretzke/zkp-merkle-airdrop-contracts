// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./Whitelist.sol";

contract Whitelist721LazyMint is Whitelist, ERC721 {
    using SafeMath for uint256;
    using Counters for Counters.Counter;
    
    Counters.Counter private tokenCounter;

    event Minted(address indexed to, uint256 indexed tokenId);

    struct UserMetadata {
        uint256 currentTokenId;
        bool holder;
    }

    struct TokenMetadata {
        bytes32 mint_root;
    }

    mapping(uint256 => TokenMetadata) private tMetadata;

    mapping(address => UserMetadata) private userMetadata;

    constructor(IPlonkVerifier _verifier, bytes32 _root) 
        Whitelist(_verifier, _root)
        ERC721("Spectral Whitelist Token", "SWLT") { 
            tokenCounter.increment(); // increment to 1 
        }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    // @dev - claim the NFT token + update root in token metadata
    function claim(bytes calldata proof) public {
        require(isWhitelisted(proof, msg.sender), "not whitelisted");
        // burn previous token and mint new token
        if(userMetadata[msg.sender].holder) {
            uint256 burnerId = userMetadata[msg.sender].currentTokenId;
            require(_exists(burnerId), "tokenID does is not exist"); 
            require(msg.sender == ownerOf(burnerId), "sender is not the owner");
            _burn(burnerId);
        }
        // mint the token + set token metadata
        _minter();
    }

    function isTokenExpired(address _user) public view returns (bool) {
        require(userMetadata[_user].holder == true, "User is not a holder");
        require(userMetadata[_user].currentTokenId != 0, "TokenId is unintialized");

        uint256 tokenId = userMetadata[_user].currentTokenId;

        require(_exists(tokenId), "tokenID does is not exist");
        require(_user == ownerOf(tokenId), "sender is not the owner");

        if(tMetadata[tokenId].mint_root != root){
            return true;
        }
        else {
            return false;
        }
    }

    function _minter() private {
        require(balanceOf(msg.sender) == 0, "Sender already holds token");

        if(_exists(tokenCounter.current())){
            tokenCounter.increment();
        }

        require(!_exists(tokenCounter.current()), "tokenID already exists");
        uint256 tokenId = tokenCounter.current();

        // mint token
        _safeMint(msg.sender, tokenId);

        tMetadata[tokenId].mint_root = root;
        userMetadata[msg.sender].holder = true;
        userMetadata[msg.sender].currentTokenId = tokenId;

        emit Minted(msg.sender, tokenId);
    }
}