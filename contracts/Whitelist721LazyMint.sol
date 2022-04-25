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

        uint256 tokenId = tokenCounter.current();
        require(!_exists(tokenId), "tokenID already exists");
        // mint the token + set token metadata
        _safeMint(msg.sender, tokenId);
    }

    function isTokenExpired(address _user) public view returns (bool) {
        require(userMetadata[_user].holder == true, "User is not a holder");
        require(userMetadata[_user].currentTokenId != 0, "TokenId is unintialized");

        uint256 tokenId = userMetadata[_user].currentTokenId;

        require(_exists(tokenId), "tokenID does is not exist");
        require(_user == ownerOf(tokenId), "sender is not the owner");

        return (tMetadata[tokenId].mint_root != root) ? true : false;
    }

    function _safeMint(address _to, uint256 _tokenId, bytes memory _data) internal override {
        require(balanceOf(_to) == 0, "Sender already holds token");
        // mint token
        super._safeMint(_to, _tokenId, _data);

        tMetadata[_tokenId].mint_root = root;
        userMetadata[_to].holder = true;
        userMetadata[_to].currentTokenId = _tokenId;
        tokenCounter.increment();

        emit Minted(_to, _tokenId);
    }
}